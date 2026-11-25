# Registro de Conversa: Projeto Final de IHC
**Organizador Acadêmico Inteligente** · Universidade Federal de Goiás, Instituto de Informática · Iniciado em 24 de novembro de 2026

Este documento transcreve cada prompt do usuário e o respectivo output do assistente, em ordem cronológica, até a conclusão do projeto. Os outputs que consistem em chamadas de ferramenta são resumidos como ações; o texto final de cada turno é transcrito.

## Interação 1: início do projeto

### Prompt 1
> Preciso que voce inicie o projeto lendo o escopo.pdf, pode ignorar a parte de nome e matricula, leve em consideração que preciso de um projeto dinamico, também quero um arquivo latex em que você transcreva cada promppt e output que teremos nessa conversa até a conclusão do projeto

### Output 1
**Ações executadas:**
- Leitura do `escopo.pdf` (1 página) com `pdftotext`. Resumo do escopo: aplicação web de organização acadêmica para estudantes universitários, com cadastro de disciplinas, registro de provas e trabalhos, tarefas por prazo e prioridade, calendário e painel de resumo de pendentes e concluídas.
- Criação da aplicação dinâmica, sem build e sem dependências: `index.html`, `css/style.css`, `js/app.js`. Dados persistidos em `localStorage`.
- Funcionalidades: CRUD de disciplinas (com cor) e atividades (prova, trabalho, tarefa); prioridade e prazo; painel com contadores, barra de progresso, próximos prazos e atrasadas; calendário mensal navegável; filtros, busca e ordenação inteligente; tema claro e escuro; acessibilidade (rótulos ARIA, foco visível, navegação por teclado).
- Criação do arquivo de registro, a ser atualizado a cada interação.

**Observação:** o app foi apenas checado quanto à sintaxe do JavaScript; não foi aberto no navegador. Decisão pendente do usuário: backend com banco de dados e contas, ou manter somente no navegador.

## Interação 2: refinamento de UX/UI

### Prompt 2
> Dê uma refinada na UX/UI do projeto, deixe algo mais moderno, também confira o css e adicione transições, uma tela de registro de nome do aluno etc

### Output 2
**Ações executadas:**
- Redesign completo do `css/style.css`: tokens de cor e sombra, tema claro e escuro, fonte Inter, topbar translúcida, cartões com hover, botões com gradiente, calendário e listas refeitos, barra de navegação inferior no celular.
- Transições e animações: entrada suave das telas (`fadeUp`), diálogos com `pop` e desfoque do fundo, hover em cartões, itens e botões, checkbox circular animado, barra de progresso animada, toast deslizante. Todas desativadas sob `prefers-reduced-motion`.
- Revisão do CSS: atributo `hidden` agora vale sempre (`[hidden]{display:none!important}`), foco visível padronizado, estilos de campos unificados.
- Nova tela de boas-vindas e registro do aluno (nome, curso opcional, tema), com opção de entrar com dados de exemplo. Painel com saudação por horário, avatar com iniciais e perfil editável (nome, curso, tema, apagar tudo).
- Persistência migrada para a chave `oai.v2`.

**Verificação:** sintaxe do JavaScript e consistência de ids entre HTML e JS conferidas. Não foi aberto no navegador.

**Ocorrência:** a primeira tentativa de gravar o CSS foi interrompida por um classificador de segurança; o `index.html` já havia sido gravado, então o CSS e o JS foram refeitos em seguida.

## Interação 3: persistência local e logo

### Prompt 3
> Consegue criar algo para ter a permanencia de dados por parte do usuario rodar local? também mude o icone para a logo.svg na pasta public

### Output 3
**Ações executadas:**
- Criado `server.js` (Node, sem dependências, escuta só em 127.0.0.1:3000). Serve o app e expõe `GET/PUT /api/dados`, que grava em `data/db.json` com escrita atômica, validação do formato e limite de tamanho. Apenas `index.html`, `css/`, `js/` e `public/` são servidos.
- O app carrega e salva pelo servidor quando disponível, com cópia de reserva no `localStorage`. Se o servidor cair ou o `index.html` for aberto direto, segue só no navegador. Dados antigos do navegador são migrados para o arquivo na primeira execução com servidor.
- Perfil: mostra onde os dados estão salvos e ganhou **Exportar backup** e **Importar backup** (JSON).
- Ícone: `public/logo.svg` agora é o favicon, a logo da topbar e a da tela de boas-vindas (substituiu o "OA").
- Adicionados `package.json` (`npm start`), `iniciar.bat` (abre o navegador e inicia o servidor) e `.gitignore` (inclui `data/`, para não versionar dados pessoais).

**Como usar:** dar dois cliques em `iniciar.bat` ou rodar `node server.js` e acessar http://localhost:3000.

**Verificação:** servidor testado com curl (404 sem dados, PUT válido, 400 para formato inválido, 415 sem JSON, logo servida como image/svg+xml, tentativas de acessar `server.js`, `data/` e `../` retornaram 404, dados sobreviveram a reinício). Sintaxe do JS conferida. Interface não aberta no navegador.

## Interação 4: sugestões para a apresentação

### Prompt 4
> Tem mais alguma sugestão para o projeto? considere que será apresentado na disciplina de iteracao humano computador

### Output 4
Sugestões priorizadas, sem alteração de código.
- **Funcionalidades com valor em IHC:** desfazer exclusão (toast com Desfazer, em vez de confirm), atalhos de teclado e tela de ajuda, lembretes de prazo, estados vazios com chamada para ação, ajuste de tamanho de fonte e alto contraste, PWA offline.
- **Evidência de IHC para a apresentação:** mapeamento das 10 heurísticas de Nielsen para telas do app, personas e cenários de uso, teste de usabilidade com 3 a 5 colegas (tarefas, tempo, erros) e questionário SUS, checagem de acessibilidade (WCAG, Lighthouse, navegação só por teclado), protótipo ou wireframes e decisões de design justificadas.
- **Prioridade sugerida:** (1) desfazer exclusão, (2) teste de usabilidade com SUS, (3) tabela de heurísticas de Nielsen, (4) auditoria de acessibilidade, (5) abrir o app no navegador e corrigir o que aparecer, pois a interface ainda não foi testada visualmente.

## Interação 5: melhorias de UX e relatório de apoio

### Prompt 5
> no app faça 1, 3, 4, 5, 6. para aresentacao crie um relatorio.pdf para eu me apoiar nessas informacoes e criar os slides

### Output 5
**Itens do app implementados (da lista de sugestões):**
1. **Desfazer exclusão:** atividade e disciplina (com suas atividades) são removidas na hora e um aviso oferece "Desfazer" por 7 segundos. O `confirm()` bloqueante foi removido dessas ações.
3. **Lembretes de prazo:** bloco no painel com o que vence hoje e amanhã; notificação do navegador opcional, no máximo uma por dia, ativada no perfil.
4. **Acessibilidade ajustável:** tamanho do texto em 3 níveis, modo de alto contraste, aplicação imediata com Cancelar desfazendo. Contraste medido pela fórmula WCAG; selos verde e laranja do tema claro (4,05 e 4,01) e botão primário do tema escuro (2,98) estavam abaixo de 4,5 e foram corrigidos.
5. **Estados vazios com ação:** botões "Cadastrar disciplina", "Criar atividade" e "Limpar filtros".
6. **PWA offline:** `manifest.webmanifest` e `sw.js` (guarda os arquivos do app, nunca a API). Campo `atualizado` faz as edições feitas offline vencerem um arquivo mais antigo ao reconectar.

**Relatório:** `relatorio.pdf` (16 páginas, fonte em `docs/relatorio.html` e imagens em `docs/img/`). Contém visão geral, funcionalidades, persona de exemplo, decisões de design, heurísticas de Nielsen, acessibilidade com medições, arquitetura, verificações feitas, protocolo de teste de usabilidade com SUS, 12 slides sugeridos, roteiro de demonstração, perguntas da banca e limitações. Itens não realizados (teste com pessoas, Lighthouse, leitor de tela) estão marcados como "a fazer", sem números inventados.

**Verificação:** 35 testes automatizados de interface em Edge real via protocolo DevTools, 35 de 35 aprovados, sem erro de JavaScript. Capturas de tela revisadas visualmente.

**Defeitos encontrados na verificação e corrigidos:** capitalização errada em "De" na data e no título do calendário; abas do celular sobrepostas ao cabeçalho (efeito do `backdrop-filter` sobre elemento fixo); "(opcional)" quebrando linha na tela de boas-vindas; nota de armazenamento incorreta no modo servidor; uso inadequado de `role="tab"` e `role="grid"`, trocado por `aria-current` e semântica simples; opacidade de itens concluídos elevada de 0,62 para 0,75.

## Interação 6: README do projeto

### Prompt 6
> Crie tambem um README.md do projeto

### Output 6
- Criado `README.md` com descrição, funcionalidades, como executar (`iniciar.bat`, `node server.js`, `npm start`), onde ficam os dados, estrutura de arquivos, API local, tecnologias, documentação, limitações e autoria (integrantes a preencher).
- O commit único local foi atualizado (amend) para incluir o README e este registro, mantendo um só push.

## Interação 7: formatação do README e push

### Prompt 7
> Formate o readme.md melhor para mim por favor e pode fazer o push direto ja

### Output 7
- README reformatado: cabeçalho centralizado com logo e selos, índice de navegação, galeria de capturas de tela, tabelas, árvore de arquivos, avisos e emojis nos títulos. O bloco de código da estrutura estava sem o fechamento e quebrava a página; foi corrigido.
- Mantidos os integrantes que o usuário preencheu (removidos apenas um apóstrofo e pontos e vírgulas soltos). O selo de acessibilidade foi descrito sem alegar conformidade WCAG, pois não houve auditoria.
- Commit novo sobre o histórico já publicado (sem reescrever nada no remoto) e enviado com `git push origin main`.
