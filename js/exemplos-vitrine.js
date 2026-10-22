
function fotoDemo(cor, linha) {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 600;
  const g = c.getContext('2d');
  g.fillStyle = '#062616';
  g.fillRect(0, 0, 480, 600);
  g.fillStyle = cor;
  g.fillRect(90, 40, 300, 520);
  g.fillStyle = '#071018';
  g.fillRect(114, 78, 252, 420);
  g.fillStyle = '#e0b15a';
  g.font = '700 28px sans-serif';
  g.textAlign = 'center';
  g.fillText(linha, 240, 300);
  return c.toDataURL('image/jpeg', 0.72);
}

function item(parcial) {
  const descricao = String((parcial && parcial.descricao) || '').trim();
  const aviso = descricao.startsWith('Exemplo') ? descricao : `Exemplo de vitrine. ${descricao || 'Dados só para demonstração.'}`.trim();
  return {
    marca: '', modelo: '', armazenamento: 128, ram: '8 GB', cor: 'Preto', corHex: '#1a1a1a',
    condicao: 'seminovo', preco: 0, descricao: aviso, saudeBateria: null, bateriaTrocada: false,
    pecas: '', garantia: '3 meses de garantia da loja', acompanhaCaixa: false, acompanhaCarregador: false,
    fotos: [], ilustracao: 'android-furo', imagemUrl: '', visivel: true, vendido: false, ordem: 1,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...parcial,
    descricao: aviso
  };
}

export function exemplosVitrine() {
  let fotoReal = '';
  try { fotoReal = fotoDemo('#1a1a1a', 'Foto real'); } catch (e) { fotoReal = ''; }
  const produtos = {
    p1: item({
      marca: 'Apple', modelo: 'iPhone 13', armazenamento: 128, ram: '4 GB', cor: 'Meia-noite', corHex: '#1c2430',
      condicao: 'seminovo', preco: 2499, descricao: 'Aparelho testado, sem marcas fortes na tela.',
      saudeBateria: 91, bateriaTrocada: false, garantia: '3 meses de garantia da loja',
      acompanhaCaixa: true, acompanhaCarregador: false, ilustracao: 'iphone-notch',
      fotos: fotoReal ? [fotoReal] : [], ordem: 1
    }),
    p2: item({
      marca: 'Apple', modelo: 'iPhone 15', armazenamento: 256, ram: '6 GB', cor: 'Preto', corHex: '#1a1a1a',
      condicao: 'novo', preco: 4899, descricao: 'Lacrado, pronta entrega.',
      saudeBateria: 100, garantia: 'Garantia de 1 ano', acompanhaCaixa: true, acompanhaCarregador: false,
      ilustracao: 'iphone-ilha', ordem: 2
    }),
    p3: item({
      marca: 'Samsung', modelo: 'Galaxy S23', armazenamento: 256, ram: '8 GB', cor: 'Verde', corHex: '#0b7a45',
      condicao: 'usado', preco: 2190, descricao: 'Uso diário, tudo funcionando.',
      saudeBateria: 86, bateriaTrocada: true, pecas: 'Bateria e tela trocadas na assistência.',
      garantia: '90 dias nas peças trocadas', acompanhaCaixa: false, acompanhaCarregador: true,
      ilustracao: 'android-furo', ordem: 3
    }),
    p4: item({
      marca: 'Xiaomi', modelo: 'Redmi Note 13', armazenamento: 128, ram: '8 GB', cor: 'Azul', corHex: '#1d4e89',
      condicao: 'seminovo', preco: 1299, descricao: 'Poucos meses de uso.',
      saudeBateria: 97, acompanhaCaixa: true, acompanhaCarregador: true, ilustracao: 'android-gota', ordem: 4
    }),
    p5: item({
      marca: 'Motorola', modelo: 'Moto G84', armazenamento: 256, ram: '8 GB', cor: 'Grafite', corHex: '#3e4450',
      condicao: 'seminovo', preco: 990, visivel: false, ilustracao: 'android-furo', ordem: 5,
      descricao: 'Oculto na vitrine, só o lojista vê.'
    }),
    p6: item({
      marca: 'Apple', modelo: 'iPhone 11', armazenamento: 64, ram: '4 GB', cor: 'Branco', corHex: '#f2f2f2',
      condicao: 'usado', preco: 1400, vendido: true, ilustracao: 'iphone-notch', ordem: 6,
      descricao: 'Já vendido.'
    })
  };
  return {
    produtos,
    imeis: { p1: '359999111222333', p3: '353456789012345' }
  };
}
