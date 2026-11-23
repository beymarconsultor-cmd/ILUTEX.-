# ILUTEX L.S. — Página web y correo SMTP

## ¿Qué se corrigió?

- Se eliminó el aviso amarillo del modo sin instalación.
- Se conservaron el logotipo original, los colores corporativos, animaciones y las **imágenes SVG locales** de ingeniería eléctrica, antenas, tendido de líneas y radio bases.
- Los formularios de Contacto y Cotización ahora envían **todos los campos que completa el visitante** por SMTP desde un servidor Node.js, con conexión TLS cifrada.
- Si el correo no está configurado o el envío SMTP falla, se muestra un error; **no se muestra una confirmación falsa**.
- No se necesitan paquetes externos de npm.

## Configuración de correo

1. Instalar Node.js versión 22 o superior desde https://nodejs.org/.
2. Copiar `correo.config.EJEMPLO.json` como `correo.config.json`.
3. Editar esa copia con el correo receptor en `destinatario` y los datos de una cuenta SMTP emisora.
4. Para Gmail, utilizar `smtp.gmail.com`, puerto `465`, tu dirección Gmail en `usuario` y una **contraseña de aplicación**, no tu contraseña normal. Necesitas activar verificación en dos pasos en la cuenta (si esa función está disponible).
5. Ejecutar `INICIAR_WINDOWS.bat` y abrir `http://127.0.0.1:3000`.
6. Enviar una prueba desde `Contacto` o `Cotización` y verificar la bandeja de entrada y Spam.

**Aviso de seguridad:** `correo.config.json` contiene credenciales. No lo subas a repositorios ni lo distribuyas; nunca escribas esas claves dentro del HTML o JavaScript público. La página usa `Reply-To` para facilitar responder al cliente desde el correo recibido. El servidor conserva un registro local de los mensajes aceptados por el servidor SMTP en `data/solicitudes.jsonl`.

## Vista previa sin servidor

`ABRIR_PAGINA_SIN_INSTALAR.bat` abre solo una vista previa navegable; **no puede enviar correos** porque los navegadores no permiten guardar contraseñas SMTP de forma segura. Para enviar mensajes debes iniciar el servidor y tener Internet.

## Publicación

`localhost` funciona solo en el ordenador donde se ejecuta el servidor. Para captar mensajes de clientes desde cualquier dispositivo hay que desplegar la aplicación en un alojamiento con Node.js, HTTPS y un nombre de dominio; configurar SMTP en el servidor y asegurar el manejo de datos personales. No publiques este servidor de desarrollo sin endurecer su protección.

## Comprobaciones

Ejecuta `node --test tests/*.test.mjs` desde esta carpeta para probar las rutas, recursos y el manejo de errores. El envío real requiere credenciales SMTP propias y se verifica con un mensaje de prueba a una cuenta controlada por ti.

Las imágenes de proyectos incluidas son **ilustrativas** y no representan trabajos verificados de la empresa.
