# Avaliação Postural — app do Pedro Bispo

App para avaliação postural por fotos no iPad. Funciona no Safari e pode ser adicionado à tela inicial como um app. As fotos e os dados dos alunos ficam só no aparelho, em armazenamento local do navegador, e não são enviados para nenhum servidor.

## O que faz (versão 1)

- Cadastro do aluno com consentimento de uso de imagem. Sem consentimento, não é possível criar uma avaliação.
- Quatro vistas: anterior, posterior, lateral direita e lateral esquerda, com grade e fio de prumo.
- Marcação de pontos com o dedo, lupa de precisão e zoom com dois dedos.
- Cálculo automático dos ângulos com os mesmos códigos do relatório APECS (A1–A11, B1–B8, C1–C7, D1–D7), mais o retropé na vista posterior (B9, B10, opcional).
- Ângulo livre de 3 pontos em qualquer foto.
- Tabela de referências por medida, com classe A–D, fonte, população e erro de medida local. Não existe escala única para o corpo todo.
- Ficha da avaliação: condições de aquisição, sintomas, movimento, observação, até 3 prioridades e versão em linguagem simples.
- Laudo para imprimir ou salvar em PDF: capa, uma página por vista com foto marcada, tabela e miniaturas ampliadas, comparação com avaliação anterior, conduta e limites.
- Cópia de segurança (salvar e restaurar um arquivo).

## Pontos e estilo do APECS

Os pontos seguem os mesmos marcos do relatório APECS (frente, costas e laterais). Além dos pontos pares, há pontos opcionais da linha média, como no APECS: centro do rosto, incisura jugular e processo xifoide (frente); C7 e fenda glútea (costas). Eles desenham as linhas de ligação e entram nas medidas complementares A12 e A13 (frente) e B11 e B12 (costas), que não têm faixa de referência.

No laudo, a foto marcada usa o mesmo desenho do APECS: rótulos azuis à esquerda, caixas de valor à direita, linhas guia, segmentos laranja, linhas brancas ligando os pontos, pernas em azul e linha de alinhamento em vermelho. As frases de conclusão do APECS (por exemplo, "genu varum") não são copiadas.

## Calibração, repetição e evolução (20/10/2026, parte 2)

- **Calibração:** toque nas duas marcas de um fio de prumo (ou régua) de distância conhecida. O app calcula a escala (px por cm) e **corrige a inclinação da foto** nos ângulos. Com a foto calibrada, aparecem medidas complementares em cm (deslocamentos de cabeça, caixa torácica, quadril, pelve, ombros e, na lateral, trago, acrômio, trocânter e maléolo) e o ângulo craniovertebral (C8/D8). Sem calibração, essas medidas não são calculadas.
- **Checklist de captura** por avaliação, com os itens do protocolo (distância, altura da câmera, fio de prumo, roupa, adesivos, mesmas condições). O laudo informa quantos foram confirmados.
- **Câmera guiada:** moldura, grade e nível do aparelho (sensor de movimento). A inclinação do aparelho na captura fica registrada.
- **Marcação 2:** repita a marcação sem ver a primeira. O app mostra a diferença por medida e calcula o **erro técnico de medida (TEM)** acumulado, que pode ser aplicado como erro local em Referências.
- **Evolução:** antes e depois lado a lado (na mesma escala real quando as duas fotos estão calibradas), gráfico de cada medida ao longo do tempo e animação das fotos da mesma vista.
- **Laudo:** relatório do aluno (resumo em linguagem simples) ou registro técnico (completo); máscara no rosto nas vistas anterior e laterais; confirmação "conferi e validei as marcações" antes de gerar (mudar um ponto ou a calibração desfaz a validação); antes e depois, evolução, repetição de marcação e testes de movimento no registro técnico.
- **Testes de movimento:** agachamento overhead, step-down unipodal, joelho na parede (três tentativas por lado) e Thomas modificado, mais testes livres. Registro de observações e medidas, sem diagnóstico e sem pontos de corte próprios. **Pendente de validação:** conferir protocolos e termos com o manual de movimento.
- **Segurança:** trava por PIN (guardado só como hash). Não criptografa os dados; protege a tela. Se o PIN for esquecido, só apagando os dados do site no Safari, o que apaga os alunos: faça a cópia de segurança.
- **Apagar e desfazer pontos:** botão **↶ Desfazer** (desfaz marcação, movimento ou exclusão do ponto), **Apagar ponto**, e um **×** em cada ponto da lista. Tocar num ponto da foto só o seleciona; arrastar ajusta; tocar no vazio marca o ponto selecionado.
- **Ângulos livres (espaço próprio):** o botão "Ângulos livres" abre uma tela só com a foto e os ângulos, separada da marcação postural. Vários ângulos por foto, com nome editável, três tipos (3 pontos, linha × horizontal, linha × vertical), ajuste arrastando ou com as setas (passo de 0,5, 1 ou 3 px, segurando repete), desfazer, apagar ponto e refazer. Funciona nas vistas posturais e em **fotos dos testes de movimento** (agachamento overhead, joelho na parede etc.).
- **Guia de fotos para o aluno:** texto pronto para compartilhar (WhatsApp), copiar ou imprimir.

## Telas limpas por modo (23/10/2026)

A avaliação ficou separada em modos, cada um com a sua tela cheia (foto e poucos botões flutuantes, no estilo do APECS):

- **Marcação postural:** a aba de cada vista é só um resumo. "Marcar pontos" abre a tela cheia com a foto, o ponto da vez, o nome do ponto e uma miniatura da região (cabeça, pelve…) que pode ser ampliada. Botões: Grade, Contraste, Mover, Pontos (lista), Ajustar, e embaixo Desfazer, Próximo (Pular nos opcionais) e Refazer ponto. Um único "Desfazer" e um único "Refazer ponto": acabaram os botões repetidos.
- **Calibração**, **Cortar e girar** (girar de 90 em 90°, nivelar de −10° a +10° e cortar) e **Ângulos livres** têm tela cheia própria. A aba **Ângulos livres** mede qualquer foto avulsa; os testes de movimento têm foto e "Medir" no mesmo espaço.
- **Girar o iPad:** a tela cheia acompanha a janela nos dois sentidos, o menu não some e os botões continuam visíveis.

## Entrada por modo, análise rápida e modelos de medida (23/10/2026)

- **Início da avaliação:** ao abrir uma avaliação, a primeira aba é o **Início**, com cartões grandes por tarefa: Postura completa, Análise rápida, Amplitude e ângulos, Testes de movimento; e cartões menores para Resultados, Evolução, Ficha e conduta e Laudo.
- **Análise rápida:** escolhe a vista, pede a foto, abre o corte e a marcação em tela cheia e termina nos resultados **só daquela vista** (com o botão "Mostrar todas").
- **Ângulos livres:** os três tipos (3 pontos, linha × horizontal, linha × vertical) ficam sempre visíveis à direita, em botões redondos (o tipo em uso fica verde), e o botão **Terminar** encerra o ângulo ou fecha a tela.
- **Modelos de medida por teste** (agachamento overhead, step-down, joelho na parede, Thomas modificado): o botão "Modelo" carrega ângulos sugeridos, com o nome de cada ponto, e o app avança sozinho para o ângulo seguinte. **São sugestões e estão PENDENTES DE VALIDAÇÃO com o manual de movimento**; podem ser renomeadas e apagadas.

## Importar fotos e rascunho dos textos (23/10/2026)

- **Marcação:** o ponto ficou bem menor (e as linhas do esqueleto mais finas). A **lupa fica sempre no canto superior esquerdo**, sem trocar de lado.
- **Importar fotos do aluno:** cartão no Início; escolhe até 4 fotos de uma vez (salvas antes do WhatsApp em Fotos ou Arquivos) e define a vista de cada uma. Substituir uma foto existente pede confirmação.
- **Rascunho dos textos:** na Ficha e conduta, o botão "Gerar rascunho" monta a observação e a versão em linguagem simples **por regras, com os seus números, sem IA e sem enviar dados**. Você lê e edita; substituir texto já escrito pede confirmação.
- **Não feito:** vídeo (retirado desta rodada) e **colocação automática dos pontos por IA no aparelho**, que fica como próxima etapa.

## Pontos já marcados pela foto (v11, 23/10/2026)

- Ao abrir **Marcar pontos** numa vista que ainda não tem pontos, o app **sugere todos os pontos sozinho**, nas quatro vistas (anterior, posterior, lateral direita e esquerda), também na Análise rápida. Você só ajusta.
- **Tudo no aparelho:** o modelo de detecção de corpo (MediaPipe Pose Landmarker, Apache-2.0, versão lite) fica dentro do app, em `app/vendor/`. A foto não sai do iPad. Na primeira vez o app baixa e guarda cerca de 20 MB (precisa de internet); depois funciona sem internet.
- **Ajustar:** toque em qualquer ponto e arraste (a lupa fica no canto superior esquerdo); **Próximo** percorre todos os pontos; **Desfazer** volta passo a passo, inclusive a sugestão inteira; **Sugerir pontos** (botão à direita) refaz a sugestão, pedindo confirmação se já houver pontos.
- **O que o modelo acha bem:** nariz, orelhas, ombros, quadris, joelhos, tornozelos, calcanhares e ponta do pé. **Aproximações** (conferir sempre): acrômio, EIAS, EIPS, C7, axila, caixa torácica, ponto mais profundo do tronco, incisura jugular, xifoide, fenda glútea e tendão. Nas vistas anterior e posterior o lado D/E vem da posição na foto, não do rótulo do modelo; nas laterais, a direção do aluno vem do nariz (e o app avisa quando muda).
- **Marcação 2 (repetição):** não recebe sugestão, para a repetição continuar independente e o erro técnico de medida (TEM) continuar válido.
- O laudo técnico registra que os pontos foram sugeridos automaticamente e conferidos e ajustados pelo avaliador.
- **Limites:** roupa larga, foto sem os pés, objetos na frente do corpo e lado oculto nas laterais pioram a sugestão. **PENDENTE DE VALIDAÇÃO:** quanto as sugestões diferem da marcação manual do Pedro em fotos reais de alunos; conferir também a licença do modelo antes de divulgar o app a terceiros.

## Base de regras v4.0 e laudo (v12, 23/10/2026)

Do arquivo `Base_Regras_App_Postural_v4_0.json` (proposta em revisão profissional), o app absorveu só o que não alonga o laudo:

- **Registro técnico em uma linha** no laudo técnico: versão do app, versão da base de regras e origem dos pontos por vista (sugeridos automaticamente e ajustados, ou manuais).
- **Limites da avaliação** de 7 para 5 frases (juntando as repetidas). O laudo do aluno não mudou.
- **Thomas modificado:** campos de controle da pelve e de instrumento/convenção do ângulo. Sem controle da pelve confirmado, o resumo avisa que a leitura quantitativa da extensão do quadril é limitada.
- **Agachamento overhead:** campos de base (largura e rotação dos pés) e de carga/implemento.
- **Laterais:** medida complementar "Ângulo trocânter–joelho–maléolo" (C12 e D12), com o aviso de que isolado não diferencia flexão de hiperextensão.
- **Aviso de termos:** passou a incluir prever lesão, músculo fraco ou encurtado, corte universal, diagnóstico funcional e "normal".
- **Fontes:** as 11 fontes da base ficam na tela Referências (como contexto, não como ponto de corte) e não entram no laudo.
- **Não absorvido por ora:** códigos PB-* (o app mantém A3, B3, C8...), escápulas, FPI-6 (exame com as mãos), afundo, projeção frontal dinâmica e tabelas normativas do joelho na parede. O erro técnico de medida (TEM) do app, vindo da repetição da marcação, não equivale à menor mudança detectável (MDC) de teste-reteste.

## Guia de fotos com figuras (v13, 24/10/2026)

- O **Guia de fotos para o aluno** agora mostra um corpo humano em **posição anatômica** nas quatro posições (de frente, de costas, lado direito e lado esquerdo para o celular), com as marcas de D e E, a fita dos pés no chão e um diagrama do celular em pé, a cerca de 1 m do chão e 3 m do aluno.
- As figuras do guia são imagens de modelo anatômico criadas pelo Pedro no Gemini (frente, costas e lado direito; o lado esquerdo é o lado direito espelhado), recortadas e reduzidas para cerca de 30 KB cada (`app/guia-*.jpg`). Servem só para mostrar as posições (não são mapa muscular nem análise de músculos). Entram no PDF/impressão do guia e na imagem para compartilhar (v15).
- Botão **Compartilhar figuras (imagem)**: gera um PNG e abre o compartilhamento do aparelho (WhatsApp); onde não houver compartilhamento, baixa o arquivo.

## Figura-guia dos pontos com imagens do Pedro (v16, 24/10/2026)

- As figuras que mostram **onde marcar cada ponto** (`app/guide-ant.jpg`, `guide-post.jpg`, `guide-lat.jpg`) agora são as imagens de modelo anatômico criadas pelo Pedro no Gemini, no lugar das figuras anteriores, cuja autoria estava pendente. A lateral esquerda é a lateral direita espelhada pelo app.
- As coordenadas de todos os pontos (anterior 21, posterior 20, lateral 9) foram remedidas nas novas imagens. Na lateral, o braço do modelo cobre o quadril: **EIAS, EIPS e trocânter são posições aproximadas** (PENDENTE DE CONFERÊNCIA pelo Pedro).
- Atenção para publicar: o histórico do repositório ainda contém as figuras anteriores; antes de divulgar, recriar o repositório sem esse histórico.

## Tela de marcação para celular, tablet e PC (v17, 24/10/2026)

- **Nada fica por cima da foto.** A figura-guia e o nome do ponto ficam numa faixa própria (no topo; na lateral quando o celular está deitado). As ferramentas (Grade, Contraste, Mover, Pontos, Sugerir, Ajustar) ficam numa linha abaixo da foto no celular em pé e em colunas nas laterais no tablet e no PC. Os botões principais (Desfazer, Próximo, Refazer) ficam embaixo.
- **Arrastar um ponto não faz mais o ponto pular:** ele mantém a distância do toque inicial (testado: o ponto andou exatamente o quanto o dedo andou). A área de toque para pegar um ponto é maior no dedo (34 px).
- **A foto não foge mais:** com um dedo em área vazia a foto não se move (use dois dedos para aproximar e mover, ou o botão Mover). No PC, a roda do mouse faz zoom. Mudanças de tamanho da tela (barra do navegador) mantêm o zoom e a posição.
- **Cabeçalho do app** quebra em linhas no celular, sem espremer o título.
- **Vista anterior:** o ponto da cabeça sugerido automaticamente fica no lóbulo da orelha (mais para fora e para baixo que o ponto do modelo).

## Laudo na tela do celular (v18, 24/10/2026)

- A visualização do laudo no celular se ajusta à largura da tela (sem rolagem lateral): as figuras e os recortes encolhem (recortes em 3 colunas) e as tabelas largas viram **cartões** (cada linha com o nome das colunas). O PDF/impressão em A4 não muda.

## Imagem, planilha, modelos e logos (v19, 31/10/2026)

Vieram da comparação com outros apps de postura (só fontes públicas; nada copiado).

- **Salvar imagem:** na página de cada vista, o botão **Salvar imagem** gera a foto marcada em JPEG, no mesmo desenho do laudo, sem grade. O rosto segue a opção "Ocultar o rosto" do laudo. No iPad/iPhone abre o Compartilhar (WhatsApp, Arquivos); no PC baixa. Se as marcações ainda não foram validadas, o app pergunta antes. O nome do arquivo não leva o nome do aluno.
- **Planilha CSV:** em Resultados, **Exportar medidas** gera um CSV com todas as avaliações do aluno (medidas do protocolo, ângulos livres, fotos dos testes e fotos avulsas), uma linha por medida, com vírgula decimal e ponto e vírgula entre colunas (abre direto no Excel). Não leva o nome do aluno. Medida incompleta não entra; dado ausente fica vazio.
- **Meus modelos de ângulos:** na tela de ângulos livres, o botão **Modelo** agora aparece em qualquer foto e tem **Salvar os ângulos desta foto como modelo**. O modelo guarda só nomes, tipos e dicas (nenhum ponto da foto) e pode ser apagado no ×. Vai junto na cópia de segurança.
- **Logos e rodapé do laudo:** na aba Laudo, em "Logos e texto do rodapé", escolha mostrar ou não os logos do CT e da Corre+, adicione um logo próprio (PNG mantém o fundo transparente) e um texto fixo no fim do laudo. As credenciais continuam sempre no laudo.
- Versão no laudo: v13. Código das exportações em `app/exporta.js`, com testes em `exporta.test.js`.

## Mecânica da corrida em vídeo (v20, 31/10/2026)

Para substituir o uso do Yogger na avaliação da corrida, seguindo o Manual de Biomecânica da Corrida Pedro Bispo v3.0.

- **Aba Corrida** (e cartão "Mecânica da corrida" no início): condições (esteira ou solo, inclinação, calçado, câmera, momento, sintomas) e uma ficha por vista (lateral direita, lateral esquerda, posterior e frontal opcional) com **velocidade obrigatória** e quadros/s da gravação e do arquivo.
- **Vídeo quadro a quadro:** abre o vídeo das Fotos, avança ±1 e ±10 quadros, velocidade 0,25×/0,5×/1×. **O vídeo não é guardado no app**: ficam só as marcações e os quadros escolhidos.
- **Tempos:** escolha o pé e toque em "Contato inicial" e "Saída do pé" em cada passada (o pé alterna sozinho; Desfazer). O app calcula, por lado, tempo de contato e de voo (média ± desvio), cadência e a diferença entre os lados em %. Câmera lenta: tempo real = tempo no arquivo ÷ (quadros/s da gravação ÷ quadros/s do arquivo). O app tenta detectar os quadros/s do arquivo; se não conseguir, avisa.
- **Avisos do protocolo:** sem velocidade, abaixo de 60 quadros/s, quadros/s do arquivo não informados e menos de 7 passadas por lado.
- **Quadros e ângulos:** "Guardar quadro" vira uma foto com ângulos livres e modelos por vista (contato inicial, apoio médio e saída do pé na lateral; pelve, retropé e tronco na posterior; pelve e joelho na frontal). Modelos **PENDENTES DE VALIDAÇÃO** com o manual.
- **Qualidade do vídeo:** sugestão pelo protocolo (alta, moderada, baixa) e classificação do avaliador; o laudo traz a frase obrigatória do manual.
- **Laudo técnico:** página "Mecânica da corrida" com condições, tempos por lado, ângulos, avisos e limites da análise 2D (sem cadência ideal nem ponto de corte). Fotos dos quadros só com a opção de incluir fotos dos testes.
- **CSV:** cadência, contato e voo por lado e ângulos dos quadros, com a velocidade.
- Código em `app/corrida.js`, testes em `corrida.test.js`. Não testado em iPad/iPhone de verdade: conferir a precisão do avanço quadro a quadro e a detecção dos quadros/s com vídeo em câmera lenta do iPhone.

## Medidas corporais e evolução (v21, 31/10/2026)

- Na página do aluno, botão **Medidas corporais**. Cada medição tem data, observação (fita, horário, jejum, ponto) e circunferências em cm: bíceps relaxado e contraído, antebraço, coxa e panturrilha (direito e esquerdo), pescoço, tórax, cintura, abdômen e quadril. Só o que foi medido entra: vazio nunca vira zero. Valor fora do plausível gera aviso, não bloqueio.
- **Evolução:** tabela com o valor atual, a variação desde a medição anterior e desde a primeira, diferença direito − esquerdo e relação cintura/quadril (valor contínuo, sem classificação). Um **gráfico por medida** (direito em azul e esquerdo em laranja, eixo de tempo proporcional às datas) e um da relação cintura/quadril.
- **Editar e apagar** medições; **CSV** (sem o nome do aluno) e **relatório em PDF** (com o nome do aluno, credenciais e os gráficos).
- Ficam no cadastro do aluno (`medidas`), por isso entram na cópia de segurança e são apagadas com o aluno. Não dependem de avaliação postural.
- Texto do app e do relatório: circunferências somam músculo, gordura e osso; variações pequenas podem ser erro de medida; sem diagnóstico nem classificação.
- Referências consultadas (fontes públicas): padrão ISAK de circunferências, lista de medidas do Hevy (bíceps, antebraço, coxa e panturrilha em lados separados). O MFIT e o Next Fit guardam as medidas dentro da ficha de cada aluno, e as fichas não foram abertas.
- Código em `app/medidas.js`, testes em `medidas.test.js`.

## PDF gerado no próprio app e aviso de falha ao salvar (v22, 10/11/2026)

- **Salvar PDF** (aba Laudo): gera o PDF em A4 dentro do app, página por página (html2canvas 1.4.1 + jsPDF 2.5.2, licença MIT, em `app/vendor/`, baixados só na primeira vez que se gera um PDF) e depois o botão **Compartilhar PDF** abre o compartilhar do aparelho (Salvar em Arquivos, WhatsApp, Imprimir). Não depende da impressão do Safari. O texto do PDF é imagem (não dá para selecionar). O botão **Imprimir** continua igual.
- **Gravação:** se o aparelho não conseguir salvar (por exemplo, espaço cheio), aparece um aviso no topo; antes a falha era silenciosa. O app também pede ao navegador armazenamento persistente.
- Ao rodar os testes, use `node --test *.test.js` (a pasta do projeto contém outras pastas com arquivos de teste que não são do app).

## Medidas corporais dentro do laudo (v23, 10/11/2026)

- Na aba **Laudo** há a opção **Incluir no laudo as medidas corporais** (ligada por padrão quando o aluno tem medições até a data da avaliação). Ela acrescenta uma página com a evolução das circunferências, direito × esquerdo, relação cintura/quadril e os gráficos, no laudo técnico e no relatório do aluno, antes da conduta. Assim sai **um PDF só**.
- Só entram as medições com data até a data da avaliação. As credenciais não se repetem na página das medidas (já saem no fim do laudo).
- A tela **Medidas corporais** também ganhou **Salvar PDF** (gerado no app, com Compartilhar PDF), além do Imprimir.

## Testes de movimento alinhados à revisão científica (v24, 11/11/2026)

Base: revisão da skill Avaliação Física Integrada, com fontes conferidas em 11/11/2026 (relatório em `~/.claude/skills/avaliacao-fisica-integrada-pedro-bispo/references/`).

- **Step-down:** variante (lateral / anterior / outra) e **rubrica de Piva/Rabin** (mão da cintura, tronco, pelve, joelho medial ao 2º dedo = 1 ou à borda medial do pé = 2, equilíbrio; total 0–6, igual ao Manual de Movimento 2.0 §25.3). O escore só é calculado na variante lateral **e** quando o avaliador marca que todos os itens foram observáveis nos dois lados; senão o laudo lista só os itens marcados. Escala observacional: sem faixa com nome, sem risco de lesão. Os limiares da diretriz JOSPT (>2 pontos, FPPA >10°) **não** foram usados no laudo (valem só para dor patelofemoral).
- **Joelho na parede:** pé dominante, protocolo compatível e apoio das mãos. Com isso, sexo e data de nascimento do cadastro, o laudo compara o maior alcance do pé dominante com a faixa **P25–P75 de McBride et al., 2026** (899 adultos) por idade (18+) e sexo, em texto descritivo ("abaixo de P25 / na faixa central / acima de P75"). A diferença entre lados continua só em cm; sem gatilhos de 2 ou 3 cm.
- **Thomas:** rótulos com a convenção de sinal (coxa: 0 = horizontal, + abaixo do plano da maca, − acima; joelho: 0 = extensão completa). A diferença entre lados do ângulo com sinal sai sem porcentagem. Sem controle da pelve confirmado, o laudo descreve a posição e diz que a estimativa de extensão do quadril é inconclusiva.
- **PENDENTE DE VALIDAÇÃO:** (1) a tabela de McBride foi transcrita de um documento conferido pelo Pedro; o artigo é pago e **não foi reconferido** (está no código `WBLT_REF`, em `app/movimento.js`); (2) os modelos de ângulo dos testes continuam sem validação, exceto o FPPA (EIAS–patela–tornozelo), que tem correspondência com o Manual de Movimento 2.0 §25.7; (3) rótulos do Thomas mudaram: registros antigos mantêm os números, mas sem a convenção de sinal.
- Testado: `node --test *.test.js` (53 testes) e a tela de Movimento e o laudo no navegador, em 393 px, 820 px e PC, com dados fictícios. **Não testado em iPad/iPhone de verdade nem publicado.**

## Regras seguidas

As regras vêm do `Manual_Avaliacao_Postural_Fotogrametria_APECS_Pedro_Bispo_v3_0_REVISADO.md` e do complemento técnico de 20/10/2026:

- Nenhuma nota global, risco de lesão ou diagnóstico.
- O laudo descreve, por exemplo, "projeção medial do joelho em apoio estático", e não "valgo".
- O app avisa quando a observação usa termos que o manual pede para evitar a partir de foto.
- A comparação entre avaliações só afirma mudança real quando o erro de medida local foi informado.
- Cada medida mostra o método e a convenção usados.

## Convenções dos ângulos

| Medida | Convenção |
|---|---|
| Inclinações (cabeça, ombros, axilas, tronco, pelve, joelhos e pés na posterior) | segmento entre os marcos em relação à horizontal; o texto diz o lado mais alto |
| Alinhamento corporal | linha do ponto médio superior ao ponto médio da base em relação à vertical |
| Joelho frontal (A8, A9) | 180° menos o ângulo EIAS–joelho–tornozelo; positivo = projeção medial |
| Rotação do pé (A10, A11) | tornozelo–2º dedo em relação à vertical; positivo = ponta para fora |
| Retropé (B9, B10) | linha do tendão do calcâneo em relação à linha inserção–base; positivo = calcâneo lateral |
| Cabeça lateral (C2, D2) | C7–trago em relação à vertical, como no APECS; o ângulo craniovertebral (complemento, em relação à horizontal) aparece no texto |
| Pelve lateral (C4, D4) | EIAS–EIPS em relação à horizontal; EIAS abaixo = inclinação anterior na foto |
| Fêmur e tíbia (C5, C6) | segmento em relação à vertical |
| Pé lateral (C7, D7) | maléolo lateral–antepé em relação à horizontal |

Nas vistas laterais é preciso informar para que lado o aluno olha na foto. Na lateral direita, o padrão é a direita da foto.

## Conferência com o APECS

Os testes marcam os pontos sobre as posições que o APECS desenhou no relatório de 01/10/2026 e comparam os resultados:

- Lateral direita: cabeça 42°, fêmur 2°, tíbia 7°, alinhamento 5° e pé 29°.
- Anterior: joelhos 7° e 3°, pés 16° e 8°.

Os nossos valores ficaram a até 2° dos do APECS. A diferença vem da leitura dos pontos em uma imagem reduzida.

## Arquivos

- `index.html`: página e estilos.
- `angles.js`: motor de ângulos e definição das vistas.
- `app.js`: telas, marcação na foto e armazenamento.
- `report.js`: laudo.
- `exporta.js`: planilha CSV das medidas e modelos de ângulos livres.
- `corrida.js`: mecânica da corrida (tempos, cadência, avisos, qualidade, modelos por vista).
- `medidas.js`: medidas corporais (circunferências, evolução, assimetria D−E, relação cintura/quadril).
- `*.test.js`: testes. Rodar com `node --test`.
- `build.js`: gera `dist/avaliacao-postural.html`, uma página única com tudo embutido, para publicar.
- `manifest.webmanifest` e `sw.js`: instalação na tela inicial e uso sem internet, quando servido por https.

## Próximas etapas

1. Testes de movimento: Thomas modificado, agachamento overhead, joelho na parede, step-down (ângulo de projeção do joelho).
2. Detecção automática dos pontos, com ajuste manual.
3. Vídeo de corrida e agachamento, quadro a quadro.
