import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { clearSession, getSession } from "../../hooks/useSession";

const drawerWidth = 260;

const menuItems = [
  { label: "Visão Geral", href: "/app" },
  { label: "Usuários", href: "/app/usuarios", roles: ["admin"] },
  { label: "Clientes", href: "/app/clientes", roles: ["admin", "vendas"] },
  { label: "Fornecedores", href: "/app/fornecedores", roles: ["admin", "financeiro"] },
  { label: "Insumos", href: "/app/insumos", roles: ["admin", "producao"] },
  { label: "Tipos de Café", href: "/app/tipos-cafe", roles: ["admin", "producao"] },
  { label: "Lotes", href: "/app/lotes", roles: ["admin", "producao"] },
  { label: "Entrada de Insumos", href: "/app/entrada-insumos", roles: ["admin", "producao"] },
  { label: "Fabricação de Lotes", href: "/app/fabricacao-lotes", roles: ["admin", "producao"] },
  { label: "Dashboard Insumos", href: "/app/dashboard-insumos", roles: ["admin", "producao"] },
  { label: "Dashboard Lotes", href: "/app/dashboard-lotes", roles: ["admin", "producao"] },
  { label: "Nova Venda", href: "/app/nova-venda", roles: ["admin", "vendas"] },
  { label: "Gestão de Vendas", href: "/app/vendas", roles: ["admin", "vendas"] },
  { label: "Detalhe do Cliente", href: "/app/detalhe-cliente", roles: ["admin", "vendas"] },
  { label: "Dashboard Fornecedores", href: "/app/dashboard-fornecedores", roles: ["admin", "financeiro"] },
  { label: "Detalhe do Fornecedor", href: "/app/detalhe-fornecedor", roles: ["admin", "financeiro"] },
  { label: "Contas a Pagar", href: "/app/contas-pagar", roles: ["admin", "financeiro"] },
  { label: "Contas a Receber", href: "/app/contas-receber", roles: ["admin", "financeiro", "vendas"] },
];

const AppLayout = ({ title, children }) => {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
    setReady(true);
  }, [router]);

  const filteredMenu = useMemo(() => {
    if (!session) return [];
    return menuItems.filter((item) =>
      item.roles ? item.roles.includes(session.perfil) : true
    );
  }, [session]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (!ready) {
    return null;
  }

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={700}>
            MVP Coffee System
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box textAlign="right">
              <Typography variant="body2">{session?.nome}</Typography>
              <Typography variant="caption" color="text.secondary">
                {session?.perfil}
              </Typography>
            </Box>
            <Avatar>{session?.nome?.charAt(0)}</Avatar>
            <Button color="inherit" onClick={handleLogout}>
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {filteredMenu.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton component={Link} href={item.href} selected={router.pathname === item.href}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        <Divider />
        <Box px={2} py={2}>
          <Typography variant="caption" color="text.secondary">
            Segurança: sessão expira em 8h.
          </Typography>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
        <Toolbar />
        {title ? (
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {title}
          </Typography>
        ) : null}
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
