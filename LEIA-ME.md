# Sua Loja — site pronto para loja de celular

Modelo em branco para vender a lojas de celular e comércios locais. Não traz nome, logo, WhatsApp, Instagram, e-mail nem projeto de Firebase de nenhuma loja. Tudo que muda de uma loja para outra está em `js/config.js`.

O cliente abre a vitrine, escolhe um aparelho, pede avaliação do iPhone na troca ou um orçamento. O lojista acompanha no painel, gera o link de cadastro, emite o recibo e consulta o histórico.

## O que está incluso

- Vitrine com foto real ou imagem ilustrativa, filtros e página de cada aparelho.
- Painel para cadastrar, editar, ocultar, marcar como vendido, ordenar e apagar.
- Formulários de interesse, troca de iPhone e orçamento, gravados em `pedidos`, com aviso por e-mail (FormSubmit).
- Cadastro do cliente por link de uso único, recibo com termo de garantia e histórico de vendas.
- Sessões dos aparelhos logados no painel, com opção de desconectar os outros.
- Simulador de taxa de cartão para o balcão.
- Segurança: só entra no painel quem está na lista `ADMINS`; as páginas de painel, cadastro e recibo não aparecem dentro de um iframe; os formulários públicos têm honeypot, tempo mínimo de 3 segundos e no máximo 3 envios a cada 10 minutos.
- Modo demonstração automático enquanto o Firebase estiver com `TODO`: a vitrine mostra aparelhos marcados como **Exemplo**, só neste navegador.

## Como entregar para uma loja

1. Copie o conteúdo desta pasta para um repositório novo, na raiz (não dentro de outro site).
2. Siga o `GUIA-INSTALACAO.md` com o dono da loja.
3. Troque a logo, as cores e os dados em `js/config.js` antes de publicar.

A senha do painel não fica em nenhum arquivo. Ela é criada no Firebase.
