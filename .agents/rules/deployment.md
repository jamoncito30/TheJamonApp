# Regla de Despliegue en Producción - TheJamonApp

> **Organización en Vercel**: `JamonProjects`  
> **Repositorio**: `https://github.com/jamoncito30/TheJamonApp.git`  
> **Rama de producción**: `main`

## Instrucciones de Despliegue Automático
- La aplicación se encuentra vinculada a Vercel bajo la organización **JamonProjects** y sincronizada directamente con la rama `main`.
- Cualquier cambio en el código fuente debe ser confirmado y enviado (`git commit` / `git push origin main`), lo que desencadenará un despliegue automático (CI/CD) en Vercel.
- Al modificar configuraciones de compilación (`vite.config.js`, `package.json`, `build.js`), rutas de assets o variables de entorno, asegúrate de mantener la compatibilidad con el entorno estático y la PWA.
