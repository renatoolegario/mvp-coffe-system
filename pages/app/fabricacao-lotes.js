import { useEffect } from "react";
import { useRouter } from "next/router";

const FabricacaoLotesPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/producao");
  }, [router]);

  return null;
};

export default FabricacaoLotesPage;
