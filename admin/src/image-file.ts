export async function compressImage(file: File, maxSide = 760, maxBytes = 90000): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choisissez une photo valide.");
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cette photo ne peut pas être lue."));
    image.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Compression de la photo impossible.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(source.src);
  let quality = .82;
  let blob: Blob | null = null;
  do {
    blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
    quality -= .08;
  } while (blob && blob.size > maxBytes && quality >= .34);
  if (!blob || blob.size > maxBytes * 1.5) throw new Error("La photo reste trop lourde. Choisissez une image plus légère.");
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture de la photo impossible."));
    reader.readAsDataURL(blob);
  });
}
