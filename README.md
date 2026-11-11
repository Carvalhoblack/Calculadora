# Calculadora Web

Calculadora científica **open source** feita com HTML, CSS e JavaScript puro, sem frameworks e sem dependências. Roda direto no navegador e pode ser publicada no GitHub Pages.

## Recursos

- Operações básicas, parênteses, potência (`^`), fatorial (`!`) e porcentagem (`%`)
- Modo científico: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `log`, `ln`, `√`, `|x|`, `π`, `e`
- Alternância entre graus (DEG) e radianos (RAD)
- Histórico de cálculos salvo no navegador (clique para reutilizar a expressão)
- Botão **ANS** para reaproveitar o último resultado
- Resultado em tempo real enquanto você digita
- Tema claro e escuro (respeita a preferência do sistema)
- Suporte completo ao teclado
- Interface responsiva e acessível (rótulos ARIA, foco visível)
- **Sem `eval()`**: o motor tem tokenizador e parser próprios, então não executa código arbitrário
- Testes automatizados com o runner nativo do Node.js

## Como usar

Não precisa de build. Clone o repositório e abra o `index.html` no navegador:

```bash
git clone https://github.com/SEU-USUARIO/calculadora-web.git
cd calculadora-web
# abra index.html no navegador, ou sirva localmente:
npx serve .
```

## Atalhos de teclado

| Tecla | Ação |
|---|---|
| `0-9`, `.` ou `,` | Dígitos e separador decimal |
| `+` `-` `*` `/` `^` | Operadores |
| `(` `)` | Parênteses |
| `%` `!` | Porcentagem e fatorial |
| `Enter` ou `=` | Calcular |
| `Backspace` | Apagar o último caractere |
| `Esc` ou `Delete` | Limpar tudo |

## Regras de cálculo

- `200 + 10%` resulta em `220` (10% de 200 somado a 200). Já `50%` sozinho vale `0,5`.
- Potências são associativas à direita: `2^3^2 = 512`.
- `-2^2 = -4`, como na matemática.
- Multiplicação implícita: `2(3+1) = 8` e `2π`.
- Parênteses abertos são fechados automaticamente: `(2+3` vale `5`.
- Números muito grandes ou pequenos aparecem como `1×10^21`.

## Estrutura do projeto

```
calculadora-web/
├── index.html        # Estrutura da página
├── style.css         # Estilos, temas claro/escuro e responsividade
├── engine.js         # Motor de cálculo (tokenizador + parser + avaliador)
├── app.js            # Interface: teclado, histórico, preferências
├── engine.test.js    # Testes automatizados do motor
├── package.json
├── LICENSE
├── CONTRIBUTING.md
└── README.md
```

O `engine.js` é independente da interface: funciona no navegador (`window.CalcEngine`) e no Node.js (`require('./engine.js')`).

```js
const { evaluate } = require('./engine.js');

evaluate('2+3×(4−1)').formatted;                      // "11"
evaluate('sin(30)').formatted;                        // "0.5" (graus)
evaluate('sin(pi/2)', { angleMode: 'rad' }).formatted; // "1"
```

## Testes

Requer Node.js 18 ou superior:

```bash
npm test
```

## Publicar no GitHub

```bash
cd calculadora-web
git init
git add .
git commit -m "feat: calculadora web inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/calculadora-web.git
git push -u origin main
```

Para colocar no ar com **GitHub Pages**: no repositório, vá em *Settings → Pages*, escolha *Deploy from a branch*, selecione `main` e a pasta `/ (root)`. O site ficará em `https://SEU-USUARIO.github.io/calculadora-web/`.

Depois de publicar, troque `SEU-USUARIO` pelo seu usuário no `README.md` e no link do rodapé do `index.html`, e coloque seu nome no `LICENSE`.

## Contribuindo

Contribuições são bem-vindas. Leia o [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Distribuído sob a licença [MIT](LICENSE).
