# Plugin de España para Keirost

Normativa española como plugin de [OpenFactu](https://github.com/AngelAcedo12/OpenFactu): impuestos, plan contable, nómina, tipos de documento, terminología y Libro de IVA.

Estos valores son los que Keirost traía de fábrica antes de separarlos. **Nadie los ha certificado legalmente**: revísalos con tu asesoría antes de usarlos en producción.

## Instalación

El plugin tiene que estar en `plugins/openfactu-plugin-es` del servidor.

```bash
git clone <este repositorio> plugins/openfactu-plugin-es
cd plugins/openfactu-plugin-es
npm install
npm run build
```

`npm run build` genera `index.js`, que es lo que carga el servidor compilado. En desarrollo basta con `npm run link:local` desde la plataforma, que crea un enlace a este repositorio.

Las empresas de España, y las que ya tienen grupos de impuestos `IVA*`, reciben el plugin activado al arrancar el servidor.

**Al desplegar, instala primero el plugin y luego actualiza el servidor.** Sin el plugin las facturas siguen funcionando, pero no hay Libro de IVA y los términos son genéricos.

## Estructura

```
openfactu-plugin-es/
├── index.ts               ← Lo que necesita código: el Libro de IVA
├── manifest.json          ← Nombre y descripción en el gestor de plugins
├── data/
│   ├── pack.json          ← Identidad del paquete y países
│   ├── taxes.json         ← IVA0, IVA4, IVA10, IVA21
│   ├── accounts.json      ← Plan contable abreviado
│   ├── account-mappings.json
│   ├── payroll-concepts.json
│   ├── document-types.json
│   └── terminology.json   ← "IVA", "CIF/NIF", en español e inglés
├── i18n/                  ← Textos del plugin: es.json, en.json…
├── src/
│   └── libroIva.ts
└── tests/
```

## Cambiar la normativa

Para cambiar un tipo, una cuenta o un concepto no hace falta programar: edita el JSON de `data/`, comprueba que es válido y sube la versión en `pack.json`.

```bash
npm run validate
```

Solo se **añade** lo que falte. Lo que una empresa ya tenga, y lo que haya cambiado, no se pisa. Los documentos emitidos conservan los impuestos con los que se emitieron.

## Traducir

Los textos del plugin (nombre, menús, Libro de IVA) están en `i18n/`, un fichero por idioma. Para añadir uno, crea por ejemplo `i18n/fr.json` con las mismas claves. `npm run validate` avisa si falta alguna o si no coinciden las variables `{nombre}`.

Los impuestos, cuentas y conceptos de nómina no se traducen: se instalan como datos de la empresa, en español.

## Pruebas

```bash
npm test
```

## Licencia

MIT
