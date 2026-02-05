import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";
import Link from "next/link";

const IndexPage = () => (
  <Box sx={{ backgroundColor: "#f9f5f1", minHeight: "100vh" }}>
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Grid container spacing={6} alignItems="center">
        <Grid item xs={12} md={6}>
          <Typography variant="overline" color="text.secondary">
            Café artesanal direto do produtor
          </Typography>
          <Typography variant="h2" fontWeight={700} gutterBottom>
            Café torrado fresco para equipes que valorizam qualidade.
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Torra média e escura com rastreabilidade total, aromas intensos e entrega
            semanal para manter a consistência do seu negócio.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="contained" size="large" component={Link} href="/login">
              Acessar o sistema
            </Button>
            <Button variant="outlined" size="large" component={Link} href="/login">
              Quero degustar
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              backgroundColor: "#fff",
              borderRadius: 4,
              p: 4,
              boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            }}
          >
            <Typography variant="h5" fontWeight={600} gutterBottom>
              O que entregamos
            </Typography>
            <Stack spacing={2}>
              {[
                "Café torrado na semana com controle de qualidade.",
                "Curadoria de blends premiados e opções especiais.",
                "Logística recorrente para cafeterias, escritórios e revendas.",
              ].map((item) => (
                <Typography key={item} variant="body1" color="text.secondary">
                  • {item}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

export default IndexPage;
