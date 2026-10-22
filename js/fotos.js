/* Comprime fotos no navegador para caber no Firestore (plano Spark, sem Storage). */

export function comprimirFoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let lado = 960;
      let qualidade = 0.72;
      let data = '';
      for (let i = 0; i < 6; i++) {
        const escala = Math.min(1, lado / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        data = canvas.toDataURL('image/jpeg', qualidade);
        if (data.length <= 180000) break;
        lado = Math.round(lado * 0.8);
        qualidade = Math.max(0.45, qualidade - 0.08);
      }
      if (!data.startsWith('data:image/jpeg') || data.length > 200000) {
        reject(new Error('grande'));
        return;
      }
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem')); };
    img.src = url;
  });
}
