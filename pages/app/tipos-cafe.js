import { Alert, Button, Stack } from "@mui/material";
import { useRouter } from "next/router";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";

const TiposCafePage = () => {
  const router = useRouter();

  return (
    <AppLayout>
      <PageHeader
        title="Tipos de Café descontinuado"
        subtitle="Agora toda produção é vinculada diretamente aos insumos."
      />
      <Stack spacing={2}>
        <Alert severity="info">
          Este módulo não é mais utilizado. Cadastre e gerencie tudo em Insumos.
        </Alert>
        <Button variant="contained" onClick={() => router.push("/app/insumos")}>
          Ir para Insumos
        </Button>
      </Stack>
    </AppLayout>
  );
};

export default TiposCafePage;
