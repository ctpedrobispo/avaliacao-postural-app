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
- `angles.test.js movimento.test.js`: testes. Rodar com `node --test angles.test.js movimento.test.js`.
- `build.js`: gera `dist/avaliacao-postural.html`, uma página única com tudo embutido, para publicar.
- `manifest.webmanifest` e `sw.js`: instalação na tela inicial e uso sem internet, quando servido por https.

## Próximas etapas

1. Testes de movimento: Thomas modificado, agachamento overhead, joelho na parede, step-down (ângulo de projeção do joelho).
2. Detecção automática dos pontos, com ajuste manual.
3. Vídeo de corrida e agachamento, quadro a quadro.
