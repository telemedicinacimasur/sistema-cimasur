# Guía de Instalación Local - Aplicación CIMASUR (SQL)

Esta aplicación ha sido migrada a una arquitectura **SQL Local (SQLite)**. Esto significa que todos sus datos se guardan en su propio computador, sin depender de la nube ni de servicios externos de Google.

## Paso 1: Requisitos Previos
Para ejecutar esta aplicación en su PC, necesita tener instalado **Node.js**.
1. Descargue Node.js desde: [https://nodejs.org/](https://nodejs.org/) (elija la versión "LTS").
2. Instálelo siguiendo los pasos predeterminados en su computador.

## Paso 2: Descargar la Aplicación
1. En la interfaz de **AI Studio**, haga clic en el menú (ícono de engranaje o configuración) en la parte superior derecha.
2. Seleccione la opción **"Export to ZIP"** o **"Export to GitHub"**.
3. Guarde el archivo en una carpeta de su elección y descomprímalo si es un archivo ZIP.

## Paso 3: Instalación de Dependencias
Una vez que tenga la carpeta del proyecto en su computador:
1. Abra una **Terminal** o **Símbolo del Sistema** (CMD).
2. Navegue hasta la carpeta del proyecto (ejecute `cd ruta/a/mi/carpeta`).
3. Ejecute el siguiente comando para instalar todo lo necesario:
   ```bash
   npm install
   ```
   *Esto descargará el motor de base de datos SQL y las librerías de la aplicación.*

## Paso 4: Ejecutar la Aplicación
Para iniciar el sistema, ejecute el siguiente comando en la terminal:
   ```bash
   npm run dev
   ```
La terminal indicará que el servidor está corriendo en:
`http://localhost:3000`

Abra esa dirección en su navegador favorito (Chrome, Edge, Firefox).

## Paso 5: Acceso Inicial (Cuentas de Administrador)
Los datos están pre-configurados para el primer inicio. El acceso principal es:

*   **Usuario (Email):** `admin@cimasur.cl`
*   **Contraseña:** `admin123`

### Notas de Gestión:
- **Base de Datos:** Sus datos se guardan en un archivo llamado `database.sqlite` dentro de la carpeta del proyecto. ¡No borre este archivo si quiere conservar su información!
- **CPANEL:** Como administrador, puede ir a la sección "Módulo Admin" -> "Gestión de Usuarios (CPANEL)" para crear nuevas cuentas, cambiar contraseñas o eliminar accesos de sus empleados o colaboradores.
- **Privacidad:** Al ser SQL Local, nadie fuera de su red tiene acceso a estos datos. Usted es el dueño total de su información.

---
*Desarrollado para CIMASUR - Gestión Técnica Integral.*
