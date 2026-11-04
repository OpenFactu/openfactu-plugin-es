import type {
  PluginContext,
  PluginReportDefinition,
  PluginReportResult,
} from '@openfactu/plugin-sdk';

type Kind = 'output' | 'input';

const COLUMNS = [
  { key: 'date', label: 'plugins.es.libroIva.col.date', format: 'date', width: '10%' },
  { key: 'code', label: 'plugins.es.libroIva.col.code', width: '14%' },
  { key: 'partnerNif', label: 'plugins.es.libroIva.col.taxId', width: '12%' },
  { key: 'partnerName', label: 'plugins.es.libroIva.col.partner' },
  { key: 'base', label: 'plugins.es.libroIva.col.base', format: 'money', align: 'right', width: '12%' },
  { key: 'tax', label: 'plugins.es.libroIva.col.tax', format: 'money', align: 'right', width: '12%' },
  { key: 'total', label: 'plugins.es.libroIva.col.total', format: 'money', align: 'right', width: '12%' },
] as const;

const sum = (rows: any[], key: string) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

/** Fila de libro: el código de factura se forma con serie, periodo y número. */
export function toBookRow(r: any) {
  return {
    date: r.date,
    code: `${r.prefix || ''}-${r.periodCode || ''}-${String(r.docNum).padStart(6, '0')}`,
    partnerNif: r.partnerNif || '',
    partnerName: r.partnerName || '',
    base: Number(r.subtotal),
    tax: Number(r.taxTotal),
    total: Number(r.total),
  };
}

/** Las tres secciones del libro, con los totales y el resultado del periodo. */
export function bookSections(
  output: any[],
  input: any[],
  t: (key: string) => string,
): PluginReportResult['sections'] {
  const totals = (rows: any[], label: string) => ({
    label,
    values: { base: sum(rows, 'base'), tax: sum(rows, 'tax'), total: sum(rows, 'total') },
  });
  return [
    {
      title: 'plugins.es.libroIva.output',
      columns: [...COLUMNS],
      rows: output,
      totals: totals(output, 'plugins.es.libroIva.outputTotal'),
    },
    {
      title: 'plugins.es.libroIva.input',
      columns: [...COLUMNS],
      rows: input,
      totals: totals(input, 'plugins.es.libroIva.inputTotal'),
    },
    {
      title: 'plugins.es.libroIva.result',
      columns: [
        { key: 'label', label: '', width: '80%' },
        { key: 'amount', label: 'plugins.es.libroIva.col.amount', format: 'money', align: 'right', width: '20%' },
      ],
      rows: [
        { label: t('plugins.es.libroIva.outputRow'), amount: sum(output, 'tax') },
        { label: t('plugins.es.libroIva.inputRow'), amount: -sum(input, 'tax') },
        { label: t('plugins.es.libroIva.balance'), amount: sum(output, 'tax') - sum(input, 'tax') },
      ],
    },
  ];
}

/** Libro de IVA repercutido y soportado, base del modelo 303. */
export function createLibroIva({ schema, ops }: PluginContext['db']): PluginReportDefinition {
  const query = async (db: any, kind: Kind, from?: Date, to?: Date) => {
    const table = kind === 'output' ? schema.salesInvoices : schema.purchaseInvoices;
    const conds: any[] = [ops.eq(table.status, 'O')];
    if (from) conds.push(ops.gte(table.date, from));
    if (to) conds.push(ops.lte(table.date, to));
    const rows = await db
      .select({
        docNum: table.docNum,
        date: table.date,
        partnerName: schema.businessPartners.name,
        partnerNif: schema.businessPartners.nif,
        subtotal: table.subtotal,
        taxTotal: table.taxTotal,
        total: table.total,
        prefix: schema.documentSeries.prefix,
        periodCode: schema.accountingPeriods.code,
      })
      .from(table)
      .leftJoin(schema.businessPartners, ops.eq(table.partnerId, schema.businessPartners.id))
      .leftJoin(schema.documentSeries, ops.eq(table.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, ops.eq(table.periodId, schema.accountingPeriods.id))
      .where(ops.and(...conds))
      .orderBy(ops.asc(table.date));
    return rows.map(toBookRow);
  };

  return {
    id: 'libro-iva',
    title: 'plugins.es.libroIva.title',
    description: 'plugins.es.libroIva.description',
    run: async ({ db, filters, t }) => {
      const [output, input] = await Promise.all([
        query(db, 'output', filters.from, filters.to),
        query(db, 'input', filters.from, filters.to),
      ]);
      return {
        subtitle: 'plugins.es.libroIva.subtitle',
        orientation: 'landscape',
        sections: bookSections(output, input, t),
      };
    },
  };
}
