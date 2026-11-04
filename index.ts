/**
 * Normativa española para Keirost.
 *
 * Impuestos, plan contable, conceptos de nómina y términos están en `data/`: el
 * servidor los carga solo. Aquí queda lo que necesita código.
 */
import type { PluginContext } from '@openfactu/plugin-sdk';
import { createLibroIva } from './src/libroIva';

export const init = async ({ reports, db }: PluginContext) => {
  reports.register(createLibroIva(db));
};
