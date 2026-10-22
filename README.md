# Voleibol Master

Aplicación móvil Expo / React Native con prioridad Android. La guía, los diagramas y los ejercicios básicos están integrados en la app y no requieren conexión. Los enlaces a reglamentos oficiales sí necesitan internet. Favoritos, notas y avance del cuestionario se guardan localmente en el dispositivo, sin cuenta.

## Funciones de esta versión

- Cancha de seis posiciones; selección de 4-2, 5-1 y 6-2; seis rotaciones y cambio entre alineación, recepción, ataque y defensa.
- Secuencia paso a paso con reproducción y pausa; las posiciones posteriores al saque son ejemplos tácticos, no una alineación reglamentaria universal.
- Guía introductoria de los roles, comparación de sistemas, reglas seleccionadas y diccionario bilingüe breve.
- Ejercicios iniciales, cuestionario con explicación y persistencia local de favoritos, notas y aciertos.
- Enlaces al reglamento FIVB 2025–2028 en español y a materiales de entrenamiento.

La versión actual es una primera entrega funcional, no contiene todavía la biblioteca completa de jugadas ni una ficha exhaustiva para cada rol. Los patrones de recepción y defensa del diagrama son orientativos; deben adaptarse al equipo y al entrenador. Las reglas particulares del líbero pueden variar por competición.

## Generar un APK de depuración en un ordenador

El entorno de edición no incluye un SDK Android para compilar ni un teléfono/emulador para instalar y probar el APK. Estos pasos deben ejecutarse localmente desde la carpeta del proyecto.

1. Instala Node.js compatible con Expo SDK 54 (Node 20.19 o posterior), Android Studio y Android SDK Platform 36. Conecta un teléfono Android o habilita la instalación de aplicaciones externas para instalar el archivo final.
2. Instala las dependencias del proyecto: `bun install` (o `npm install`).
3. Genera el proyecto Android nativo: `npx expo prebuild --platform android`.
4. Compila el APK de depuración:
   - macOS/Linux: `cd android && ./gradlew assembleDebug`
   - Windows: `cd android` y luego `gradlew.bat assembleDebug`
5. El archivo se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. Transfiérelo al teléfono y ábrelo para instalar.

## APK de lanzamiento firmado

Abre la carpeta `android` con Android Studio y elige **Build → Generate Signed Bundle / APK → APK**. Crea o selecciona una clave de firma y guarda una copia segura fuera del repositorio. El APK de lanzamiento se firma con esa clave; perderla puede impedir futuras actualizaciones de la misma app. No compartas ni subas la clave ni sus contraseñas al código fuente.

## Verificación realizada

El control de tipos de TypeScript pasó y la aplicación se observó en la previsualización web. No se generó ningún APK, no se ejecutó una compilación Android local y no se verificó la instalación en un teléfono físico; por tanto, esas comprobaciones quedan pendientes.
