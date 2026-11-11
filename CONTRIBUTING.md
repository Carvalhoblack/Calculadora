# Como contribuir

Obrigado por querer ajudar! Siga os passos abaixo.

## Fluxo

1. Faça um *fork* do repositório.
2. Crie uma branch: `git checkout -b feat/minha-melhoria`.
3. Faça suas alterações e **adicione testes** em `engine.test.js` quando mexer no motor de cálculo.
4. Rode `npm test` e confirme que tudo passa.
5. Faça commit com uma mensagem clara (ex.: `feat: adiciona função cbrt`, `fix: corrige porcentagem`).
6. Abra um *Pull Request* explicando o que mudou e por quê.

## Diretrizes

- Mantenha o projeto **sem dependências** e **sem `eval()`**.
- Lógica de cálculo fica em `engine.js`; interface fica em `app.js`.
- Mantenha a acessibilidade: rótulos `aria-label` em botões só com símbolos e foco visível.
- Teste no tema claro e no escuro e em tela de celular.

## Reportando problemas

Abra uma *issue* informando a expressão digitada, o resultado esperado, o resultado obtido e o navegador usado.
