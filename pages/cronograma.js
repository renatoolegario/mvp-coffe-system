import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  CalendarMonth,
  Checklist,
  Coffee,
  EventAvailable,
  Feedback,
  Gavel,
  Groups,
  RuleFolder,
  TaskAlt,
} from "@mui/icons-material";

const reuniaoDecisoes = [
  "Definir o fluxo de trabalho das pessoas envolvidas na operação do sistema.",
  "Mapear o que cada página faz e como utilizar corretamente.",
  "Levantar melhorias iniciais e dificuldades encontradas.",
  "Definir fluxo de vendas de balcão para Café Tipo A.",
];

const fluxoBalcao = [
  'Criar um insumo interno para venda: "Café Tipo A Granel Balcão".',
  "Transferir do saco de 23 kg para esse novo produto interno.",
  'Quando o estoque físico do balcão zerar, fazer baixa com venda para o cliente "Cliente Balcão".',
  "Lançar a quantidade de café correspondente ao consumo real desse produto.",
];

const preparacaoAntesD0 = [
  "Capturar todos os clientes.",
  "Capturar todos os fornecedores.",
  "Capturar todos os colaboradores (usuários) e definir tarefas.",
  "Capturar todos os insumos e realizar contagem de estoque.",
  "Criação de conta Asaas e geração da API de integração.",
  "Contagem sugerida: inventário no início da semana e auditoria na sexta para confrontar as baixas e reduzir retrabalho.",
  "Capturar contas a pagar com fornecedor, data de pagamento e valores.",
  "Capturar contas a receber com cliente, data prevista, valores e método de pagamento.",
  "Consolidar contas a receber em planilha Excel.",
];

const viradaD0 = [
  {
    prazo: "Sábado antes do D0 • até 17h",
    atividade:
      "Lançar todos os dados reais na plataforma e executar o seed com as informações oficiais.",
  },
  {
    prazo: "Sábado antes do D0 • até 23h59",
    atividade:
      "Realizar a primeira aprovação e validação dos dados lançados (aprovar ou reprovar).",
  },
  {
    prazo: "Domingo antes do D0 • até 9h",
    atividade:
      "Ajustar todas as reprovações identificadas na primeira validação.",
  },
  {
    prazo: "Domingo antes do D0 • até 12h",
    atividade:
      "Executar a segunda aprovação e validação final dos dados lançados.",
  },
];

const semanaD0 = [
  "Criar e usar a página /system/feedbacks com: origem, descrição e print (descrição obrigatória).",
  "Registrar reportes de dificuldades.",
  "Registrar reportes de melhorias.",
  "Tratar demandas dentro da própria semana e reservar 1 hora para reunião de alinhamento.",
  "Sempre que houver novo feedback, marcar reunião para 17h30 do mesmo dia.",
];

const auditoriaChecklist = [
  "Confrontar estoque.",
  "Confrontar fluxo de contas a receber.",
  "Confrontar fluxo de contas a pagar.",
  "Confrontar fluxo de caixa (entradas e saídas).",
  "Coletar feedback sobre melhorias.",
];

const auditorias = [
  { marco: "D15", titulo: "Auditoria 1", detalhe: "Agendar data e horário." },
  { marco: "D30", titulo: "Auditoria 2", detalhe: "Agendar data e horário." },
  { marco: "D90", titulo: "Auditoria 3", detalhe: "Agendar data e horário." },
];

const sectionCardSx = {
  p: 3,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  background:
    "linear-gradient(160deg, rgba(19,46,40,0.92) 0%, rgba(12,30,26,0.9) 100%)",
};

const CronogramaPage = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 5, md: 8 },
        px: 2,
        background:
          "radial-gradient(circle at top, rgba(242,183,5,0.14) 0%, rgba(15,36,31,1) 45%, rgba(12,30,26,1) 100%)",
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={3.5} alignItems="center">
          <Paper
            sx={{
              width: "100%",
              maxWidth: 980,
              p: { xs: 3, md: 4.5 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              background:
                "radial-gradient(circle at top right, rgba(242,183,5,0.2) 0%, rgba(19,46,40,0.95) 55%, rgba(12,30,26,0.96) 100%)",
              textAlign: "center",
            }}
          >
            <Stack spacing={1.4} alignItems="center">
              <Box
                component="img"
                src="/logotipo.jpg"
                alt="Logotipo Café Essências do Brasil"
                sx={{
                  height: { xs: 72, md: 84 },
                  width: { xs: 72, md: 84 },
                  objectFit: "contain",
                  borderRadius: 2.2,
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "0 10px 35px rgba(0,0,0,0.25)",
                }}
              />
              <Chip
                icon={<CalendarMonth />}
                label="Plano operacional de implantação"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{
                  letterSpacing: 0.5,
                  fontSize: { xs: "2rem", md: "2.6rem" },
                }}
              >
                Cronograma
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sequência de decisões, preparação do D0 e auditorias para
                garantir virada segura com dados reais.
              </Typography>
            </Stack>
          </Paper>

          <Grid container spacing={3} sx={{ width: "100%", maxWidth: 980 }}>
            <Grid item xs={12} lg={7}>
              <Paper sx={sectionCardSx}>
                <Stack spacing={2.2}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <RuleFolder color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Decisões da Reunião
                    </Typography>
                  </Stack>
                  <Stack spacing={1.15}>
                    {reuniaoDecisoes.map((item) => (
                      <Stack key={item} direction="row" spacing={1.25}>
                        <TaskAlt sx={{ color: "primary.main", fontSize: 20 }} />
                        <Typography variant="body2">{item}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={5}>
              <Paper sx={sectionCardSx}>
                <Stack spacing={2.2}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Coffee color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Fluxo Sugerido para Vendas de Balcão
                    </Typography>
                  </Stack>
                  <Stack spacing={1.2}>
                    {fluxoBalcao.map((item, index) => (
                      <Stack key={item} direction="row" spacing={1.25}>
                        <Chip
                          label={index + 1}
                          size="small"
                          color="primary"
                          sx={{ minWidth: 28, fontWeight: 700 }}
                        />
                        <Typography variant="body2">{item}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={sectionCardSx}>
                <Stack spacing={2.3}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Checklist color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Fase Pré-D0 (1 a 2 semanas antes)
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Definir oficialmente o D0 (sugestão: segunda-feira) e
                    concluir os itens abaixo antes da virada.
                  </Typography>
                  <Grid container spacing={1.4}>
                    {preparacaoAntesD0.map((item) => (
                      <Grid item xs={12} md={6} key={item}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor: "rgba(15,36,31,0.6)",
                          }}
                        >
                          <Stack direction="row" spacing={1.2}>
                            <TaskAlt
                              sx={{
                                color: "primary.main",
                                fontSize: 19,
                                mt: 0.1,
                              }}
                            />
                            <Typography variant="body2">{item}</Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper sx={sectionCardSx}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <EventAvailable color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Virada D0 (Fim de Semana Anterior)
                    </Typography>
                  </Stack>
                  <Stack spacing={1.45}>
                    {viradaD0.map((etapa, index) => (
                      <Box key={etapa.prazo}>
                        <Chip
                          label={etapa.prazo}
                          size="small"
                          sx={{
                            mb: 0.85,
                            fontWeight: 700,
                            backgroundColor: "rgba(242,183,5,0.16)",
                            color: "primary.main",
                          }}
                        />
                        <Typography variant="body2">
                          {etapa.atividade}
                        </Typography>
                        {index < viradaD0.length - 1 ? (
                          <Divider sx={{ mt: 1.2 }} />
                        ) : null}
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper sx={sectionCardSx}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Feedback color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Semana do D0
                    </Typography>
                  </Stack>
                  <Stack spacing={1.15}>
                    {semanaD0.map((item) => (
                      <Stack key={item} direction="row" spacing={1.25}>
                        <TaskAlt sx={{ color: "primary.main", fontSize: 20 }} />
                        <Typography variant="body2">{item}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 2,
                      backgroundColor: "rgba(63,169,245,0.12)",
                      color: "text.primary",
                    }}
                  >
                    Regra operacional: ao lançar feedback, agenda de alinhamento
                    deve ser criada para as 17h30 do mesmo dia.
                  </Alert>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={sectionCardSx}>
                <Stack spacing={2.3}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Gavel color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Auditorias Programadas
                    </Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    {auditorias.map((auditoria) => (
                      <Grid item xs={12} md={4} key={auditoria.marco}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            minHeight: "100%",
                            backgroundColor: "rgba(15,36,31,0.62)",
                          }}
                        >
                          <Stack spacing={1.2}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography variant="subtitle1" fontWeight={700}>
                                {auditoria.titulo}
                              </Typography>
                              <Chip
                                label={auditoria.marco}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {auditoria.detalhe}
                            </Typography>
                            <Divider />
                            <Stack spacing={1}>
                              {auditoriaChecklist.map((item) => (
                                <Stack key={item} direction="row" spacing={1}>
                                  <TaskAlt
                                    sx={{
                                      color: "primary.main",
                                      fontSize: 18,
                                      mt: 0.15,
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {item}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 2.2,
                  borderRadius: 2.5,
                  border: "1px dashed",
                  borderColor: "primary.main",
                  backgroundColor: "rgba(242,183,5,0.06)",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Groups sx={{ color: "primary.main" }} />
                  <Typography variant="body2" fontWeight={600}>
                    FIM: manter a disciplina do cronograma e registrar qualquer
                    desvio na rotina de feedback.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
};

export default CronogramaPage;
