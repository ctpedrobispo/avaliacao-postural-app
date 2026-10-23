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
