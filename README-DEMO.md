# EVALIA — Demo funcional (GitHub Pages)

Aplicación de demostración estática con `site/`, lógica de negocio simulada en `site/domain.js` y 33 pruebas automatizadas en `tests/`.

**No es una aplicación de producción.** El almacenamiento se realiza en el navegador mediante `localStorage`, sin Supabase conectado, sin autenticación ni pagos reales. Los contactos, modelos y tarifas precargados son ficticios.

## Ejecutar

```bash
npm run check
python -m http.server 8765 --directory site
```

## Publicar

La rama de trabajo lleva un workflow Pages automático. En GitHub, configura **Settings → Pages → Source: GitHub Actions**. El pipeline corre pruebas antes de publicar. Más información: [docs/36_DEMO_GITHUB_PAGES.md](docs/36_DEMO_GITHUB_PAGES.md).

La integración de las operaciones reales de PostgreSQL/Supabase queda pendiente de QA y aprobación independiente; este prototipo no reemplaza las migraciones D1-A.
