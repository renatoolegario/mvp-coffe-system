import {
  AppBar,
  Avatar,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  BarChart,
  Dashboard,
  ExpandLess,
  ExpandMore,
  FactCheck,
  Group,
  Groups,
  Handshake,
  Inventory2,
  LocalCafe,
  LocalShipping,
  PointOfSale,
  PrecisionManufacturing,
  ReceiptLong,
  StackedLineChart,
} from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { clearSession, getSession } from "../../hooks/useSession";

const drawerWidth = 260;

const menuGroups = [
  {
    id: "geral",
    label: "Geral",
    icon: Dashboard,
    items: [{ label: "Visão Geral", href: "/app", icon: Dashboard }],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    icon: Groups,
    items: [
      { label: "Usuários", href: "/app/usuarios", roles: ["admin"], icon: Group },
      { label: "Clientes", href: "/app/clientes", roles: ["admin", "vendas"], icon: Handshake },
      {
        label: "Fornecedores",
        href: "/app/fornecedores",
        roles: ["admin", "financeiro"],
        icon: LocalShipping,
      },
      { label: "Insumos", href: "/app/insumos", roles: ["admin", "producao"], icon: Inventory2 },
      { label: "Tipos de Café", href: "/app/tipos-cafe", roles: ["admin", "producao"], icon: LocalCafe },
    ],
  },
  {
    id: "producao",
    label: "Produção",
    icon: PrecisionManufacturing,
    items: [
      {
        label: "Entrada de Insumos",
        href: "/app/entrada-insumos",
        roles: ["admin", "producao"],
        icon: FactCheck,
      },
      {
        label: "Fabricação de Café",
        href: "/app/fabricacao-lotes",
        roles: ["admin", "producao"],
        icon: PrecisionManufacturing,
      },
      {
        label: "Dashboard Insumos",
        href: "/app/dashboard-insumos",
        roles: ["admin", "producao"],
        icon: BarChart,
      },
      {
        label: "Dashboard Estoque",
        href: "/app/dashboard-lotes",
        roles: ["admin", "producao"],
        icon: StackedLineChart,
      },
    ],
  },
  {
    id: "vendas",
    label: "Vendas",
    icon: PointOfSale,
    items: [
      { label: "Nova Venda", href: "/app/nova-venda", roles: ["admin", "vendas"], icon: PointOfSale },
      { label: "Gestão de Vendas", href: "/app/vendas", roles: ["admin", "vendas"], icon: ReceiptLong },
      { label: "Detalhe do Cliente", href: "/app/detalhe-cliente", roles: ["admin", "vendas"], icon: Handshake },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: ReceiptLong,
    items: [
      {
        label: "Dashboard Fornecedores",
        href: "/app/dashboard-fornecedores",
        roles: ["admin", "financeiro"],
        icon: BarChart,
      },
      {
        label: "Detalhe do Fornecedor",
        href: "/app/detalhe-fornecedor",
        roles: ["admin", "financeiro"],
        icon: LocalShipping,
      },
      {
        label: "Contas a Pagar",
        href: "/app/contas-pagar",
        roles: ["admin", "financeiro"],
        icon: ReceiptLong,
      },
      {
        label: "Contas a Receber",
        href: "/app/contas-receber",
        roles: ["admin", "financeiro", "vendas"],
        icon: ReceiptLong,
      },
    ],
  },
];

const AppLayout = ({ title, children }) => {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
    setReady(true);
  }, [router]);

  const filteredGroups = useMemo(() => {
    if (!session) return [];
    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.roles ? item.roles.includes(session.perfil) : true
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [session]);

  useEffect(() => {
    if (!filteredGroups.length) return;
    setOpenGroups((prev) => {
      const next = {};
      filteredGroups.forEach((group, index) => {
        const hasActive = group.items.some((item) => item.href === router.pathname);
        next[group.id] = prev[group.id] ?? (hasActive || index === 0);
      });
      return next;
    });
  }, [filteredGroups, router.pathname]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const handleToggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  if (!ready) {
    return null;
  }

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              component="img"
              src="/logotipo.jpg"
              alt="Logotipo MVP Coffee"
              sx={{ height: 36, width: 36, objectFit: "contain", borderRadius: 1 }}
            />
            <Typography variant="h6" fontWeight={700}>
              MVP Coffee System
            </Typography>
          </Box>
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
            {filteredGroups.map((group) => (
              <Box key={group.id}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleToggleGroup(group.id)}>
                    <ListItemIcon>
                      <group.icon />
                    </ListItemIcon>
                    <ListItemText primary={group.label} />
                    {openGroups[group.id] ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={openGroups[group.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {group.items.map((item) => (
                      <ListItem key={item.href} disablePadding sx={{ pl: 2 }}>
                        <ListItemButton component={Link} href={item.href} selected={router.pathname === item.href}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <item.icon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={item.label} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
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
