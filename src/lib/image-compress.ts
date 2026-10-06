// Utilidad en el navegador para comprimir y redimensionar fotos de móvil
// antes de enviarlas al servidor (reduce de 5-15MB a ~300-500KB manteniendo nitidez total)

export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8
): Promise<File> {
  // Si no es una imagen o es un archivo SVG/pequeño (<350KB), no tocamos
  if (!file.type.startsWith("image/") || file.size < 350 * 1024) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        // Fondo blanco por si hay transparencias
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // Si por algún motivo pesa más, devolvemos el original
              resolve(file);
              return;
            }
            const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          "image/jpeg",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
