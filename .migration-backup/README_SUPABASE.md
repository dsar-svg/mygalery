# Migración a Supabase - Guía de Configuración

## Pasos para completar la migración

### 1. Crear proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto
3. Guarda las credenciales que te darán:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon/public key**

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
VITE_SUPABASE_URL=https://tu-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 3. Configurar Authentication con Google

1. En Supabase Dashboard → **Authentication** → **Providers**
2. Activa **Google**
3. Necesitarás:
   - **Google Client ID**
   - **Google Client Secret**
   
   Para obtenerlos:
   - Ve a https://console.cloud.google.com/
   - Crea un proyecto o selecciona uno existente
   - Ve a **APIs & Services** → **Credentials**
   - Crea un **OAuth 2.0 Client ID**
   - Agrega tu URL de producción (`https://mygalery-zeta.vercel.app`) como **Authorized JavaScript origin**
   - Agrega el callback URL que te da Supabase

4. Copia el **Client ID** y **Client Secret** en Supabase

### 4. Ejecutar el esquema de base de datos

1. Ve a Supabase Dashboard → **SQL Editor**
2. Copia y pega el contenido de `supabase-schema.sql`
3. Ejecuta el script

### 5. Configurar Storage

1. Ve a Supabase Dashboard → **Storage**
2. El bucket `artworks` se creará automáticamente con las políticas
3. Ejecuta el script `supabase-storage-policies.sql` en el SQL Editor

### 6. Desplegar en Vercel

1. Ve a tu proyecto en Vercel
2. Agrega las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vuelve a desplegar

### 7. Migrar datos existentes (opcional)

Si ya tienes datos en Firebase, puedes exportarlos e importarlos a Supabase.

---

## URLs importantes

- **Supabase Dashboard**: https://app.supabase.com
- **Google Cloud Console**: https://console.cloud.google.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Solución de problemas

### Error: "Invalid API key"
Verifica que las variables de entorno estén correctamente configuradas en Vercel.

### Error: "Missing credentials"
Asegúrate de haber configurado Google OAuth en Supabase.

### Error: "Policy violation" al subir imágenes
Verifica que las políticas de Storage estén correctamente aplicadas.

### El login no redirige correctamente
Asegúrate de que la URL de tu sitio esté agregada en:
- Supabase → Authentication → URL Configuration → Site URL
- Google Cloud Console → OAuth 2.0 → Authorized JavaScript origins
