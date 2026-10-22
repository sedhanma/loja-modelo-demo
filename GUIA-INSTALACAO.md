# Guia de instalação — loja de celular

Este guia é para quem vai colocar o site no ar pela primeira vez. Não precisa saber programar. O único arquivo de texto da loja é o `js/config.js`. A senha **não** entra nesse arquivo.

Enquanto o Firebase estiver com `TODO`, o site abre em demonstração neste navegador: a vitrine mostra aparelhos de exemplo e o painel aceita o usuário `loja` com qualquer senha. Isso some quando a configuração real for salva.

## 1. Criar o projeto no Firebase (plano gratuito)

1. Entre em [https://console.firebase.google.com](https://console.firebase.google.com) com um e-mail da loja.
2. Clique em **Adicionar projeto**. Dê um nome (por exemplo o nome da loja) e continue. Pode desligar o Google Analytics.
3. No canto esquerdo, clique na engrenagem → **Configurações do projeto**.
4. Em **Seus aplicativos**, clique no ícone `</>` (Web). Apelido: `site`. Não marque o Firebase Hosting. Clique em **Registrar app**.
5. Copie o bloco `firebaseConfig` que aparecer (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). Você cola isso no passo 6.
6. O plano **Spark** já é o gratuito. Não precisa cadastrar cartão.

A `apiKey` que aparece aí não é senha. Ela identifica o projeto. Quem protege os dados são as regras do passo 5.

## 2. Ativar o login por e-mail e senha

1. Menu **Build** (ou **Criação**) → **Authentication** → **Começar**.
2. Aba **Sign-in method** → **E-mail/senha** → ligue a primeira chave → **Salvar**.
3. Aba **Usuários** → **Adicionar usuário**.
4. Use o e-mail que vai administrar a loja (o mesmo que você vai colocar em `ADMINS`). Crie uma senha forte e guarde no gerenciador de senhas da loja. Não cole a senha no `config.js` nem no Git.

## 3. Desligar o cadastro público

Ainda em **Authentication** → **Configurações** (ou **Settings**) → **Ações do usuário** (User actions):

1. Desmarque **Ativar criação (inscrição)** / **Enable sign-up**, para ninguém criar conta sozinho.
2. Desmarque a opção de o próprio usuário excluir a conta, se ela estiver ligada.
3. Salve.

## 4. Criar o banco

1. Menu **Firestore Database** → **Criar banco de dados**.
2. Local: **southamerica-east1 (São Paulo)**.
3. Comece em **modo de produção**.
4. Abra a aba **Regras**, apague o que estiver lá e cole o arquivo `firestore.rules` inteiro.
5. Antes de publicar, troque `admin@sualoja.com` nos dois lugares (`isAdmin` e `isGestor`) pelo e-mail criado no passo 2. Tem de ser o mesmo de `ADMINS` e de `EMAIL_GESTOR`.
6. Clique em **Publicar**.

## 5. Preencher o `js/config.js`

Abra `js/config.js` e troque só os valores. Não apague as chaves.

| Campo | O que colocar |
| --- | --- |
| `firebaseConfig` | O bloco copiado no passo 1, no lugar de cada `TODO` |
| `LOJA_NOME` | Nome que aparece no site e no recibo |
| `CIDADE` e `UF` | Cidade e estado, por exemplo `Santos` e `SP` |
| `STORE_WHATSAPP` | Só números: `55` + DDD + número |
| `EMAIL_NOTIFICACOES` | E-mail que recebe interesse, troca e orçamento |
| `USUARIOS` | Apelido curto e o e-mail. Exemplo: `ana: "ana@email.com"` |
| `ADMINS` | Lista com esse mesmo e-mail |
| `EMAIL_GESTOR` | O mesmo e-mail, se essa pessoa puder desconectar outros aparelhos |
| `STORE` | Telefone visível, Instagram, endereço e CNPJ do recibo |
| `HORARIOS` | Texto de segunda a sexta e de sábado |
| `CORES` | Cores do tema (veja o passo 8) |

O nome do atalho na tela inicial do celular também está em `manifest.json` (`name` e `short_name`). Troque lá se for instalar o atalho.

## 6. Ativar o aviso por e-mail (FormSubmit)

O plano gratuito do Firebase não envia e-mail. O site usa o [FormSubmit](https://formsubmit.co).

1. Confirme que `EMAIL_NOTIFICACOES` é o e-mail da loja.
2. Publique o site (passo 7) e envie um formulário de teste na vitrine.
3. A loja recebe um e-mail do FormSubmit pedindo para **ativar** o endereço. Abra esse e-mail e confirme.
4. A partir daí cada interesse, troca e orçamento chega nesse e-mail. A foto fica só no painel.

O captcha do FormSubmit fica desligado de propósito: ligado, o aviso automático deixa de funcionar. O formulário já barra robô com campo invisível, espera de 3 segundos e limite de 3 envios a cada 10 minutos.

## 7. Publicar

### GitHub Pages

1. Crie um repositório **novo** no GitHub. Não use o repositório de outra loja.
2. Envie para ele **o conteúdo desta pasta** (os arquivos `index.html`, `admin.html`, `js`, `css`, `assets` na raiz do repositório).
3. **Settings** → **Pages** → Branch `main` → pasta **/ (root)** → Save.
4. O endereço fica `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
5. No Firebase, em **Authentication** → **Settings** → **Authorized domains**, adicione `SEU-USUARIO.github.io`.

### Outro endereço

Qualquer hospedagem de site estático serve. Aponte o domínio para a pasta e acrescente esse domínio nos Authorized domains do Firebase.

A vitrine é a página inicial. O painel é `admin.html`. Há um link **Painel** no rodapé.

## 8. Trocar logo e cores

- Substitua o arquivo `assets/logo.svg` pela logo da loja (SVG ou, se for PNG, troque também o `src` das imagens para o arquivo novo).
- Em `js/config.js`, o bloco `CORES` muda o site inteiro: `fundo`, `destaque`, `destaqueEscuro`, `acento` e `texto`. Salve e atualize a página.

## 9. Checklist antes de entregar

- [ ] `firebaseConfig` sem nenhum `TODO`
- [ ] E-mail igual em Authentication, `ADMINS`, `EMAIL_GESTOR` e `firestore.rules` (regras publicadas de novo)
- [ ] Cadastro público desligado no Firebase
- [ ] WhatsApp, Instagram, cidade e nome da loja conferidos no celular
- [ ] Logo nova no lugar de `assets/logo.svg`
- [ ] Um formulário de teste chegou no e-mail (depois de ativar o FormSubmit)
- [ ] Login no painel com o apelido de `USUARIOS` e a senha do Firebase
- [ ] Aparelhos de exemplo sumiram e a vitrine mostra só o que a loja cadastrou
- [ ] A faixa vermelha de demonstração não aparece mais
- [ ] A senha não está em nenhum arquivo

## Se algo falhar

| O que aparece | O que fazer |
| --- | --- |
| Faixa vermelha de demonstração | O `firebaseConfig` ainda tem `TODO` ou está incompleto |
| Sem permissão para acessar o painel | O e-mail logado não está em `ADMINS` nem nas regras. Os dois lugares precisam do mesmo e-mail |
| Usuário ou senha incorretos | Confira o usuário em Authentication. O apelido é o de `USUARIOS`. A senha é a do Firebase |
| Formulário não grava | Publique de novo o `firestore.rules` |
| E-mail não chega | Abra o e-mail de ativação do FormSubmit e confirme `EMAIL_NOTIFICACOES` |
