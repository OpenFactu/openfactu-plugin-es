import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  readPackDirectory,
  validateLocalizationPack,
  validatePluginTranslations,
} from '@openfactu/plugin-sdk/localization';
import { bookSections, toBookRow } from '../src/libroIva';

const pack: any = readPackDirectory(path.join(__dirname, '..', 'data'));

test('el paquete es válido', () => {
  assert.deepEqual(validateLocalizationPack(pack), []);
});

test('las traducciones están completas en español e inglés', () => {
  const report = validatePluginTranslations(path.join(__dirname, '..', 'i18n'));
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.languages.sort(), ['en', 'es']);
});

test('los tipos de IVA son los que traía el núcleo', () => {
  assert.deepEqual(
    pack.taxes.map((t: any) => [t.code, t.rate]),
    [
      ['IVA0', 0],
      ['IVA4', 4],
      ['IVA10', 10],
      ['IVA21', 21],
    ],
  );
});

test('las cuentas de los mapeos son las que traía el núcleo', () => {
  const byKind = Object.fromEntries(pack.accountMappings.map((m: any) => [m.kind, m.code]));
  assert.equal(byKind.tax_output, '477000');
  assert.equal(byKind.tax_input, '472000');
  assert.equal(byKind.customer_receivable, '430000');
  assert.equal(byKind.supplier_payable, '400000');
  assert.equal(byKind.payroll_income_tax, '4751000');
  assert.equal(byKind.payroll_social_employee, '476000');
  assert.equal(byKind.payroll_social_employer, '642000');
  assert.equal(byKind.payroll_net, '465000');
});

test('los conceptos de retención y cotización llevan su categoría y porcentaje', () => {
  const byCode = Object.fromEntries(pack.payrollConcepts.map((c: any) => [c.code, c]));
  assert.equal(byCode.IRPF.category, 'income_tax');
  assert.equal(byCode.IRPF.defaultPercent, 15);
  assert.equal(byCode.SS_EMP.category, 'social_employee');
  assert.equal(byCode.SS_EMP.defaultPercent, 6.35);
  assert.equal(byCode.SS_EMPRESA.category, 'social_employer');
  assert.equal(byCode.SS_EMPRESA.defaultPercent, 29.9);
  assert.equal(pack.payrollConcepts.length, 10);
});

test('libro de IVA: código de factura y resultado del periodo', () => {
  const row = toBookRow({
    prefix: 'FA',
    periodCode: '2026',
    docNum: 7,
    partnerNif: 'B12345678',
    partnerName: 'Cliente',
    subtotal: '100',
    taxTotal: '21',
    total: '121',
  });
  assert.equal(row.code, 'FA-2026-000007');
  assert.equal(row.tax, 21);

  const compra = { ...row, base: 50, tax: 10.5, total: 60.5 };
  const [repercutido, soportado, resultado] = bookSections([row], [compra], (key) => key);
  assert.equal(repercutido.totals?.values.tax, 21);
  assert.equal(soportado.totals?.values.tax, 10.5);
  assert.equal(resultado.rows[2].amount, 10.5);
});
