import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, UserPlus, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface CompanyListProps {
  companies: Tables<"companies">[];
  onEdit: (company: Tables<"companies">) => void;
  onAddAdmin: (company: Tables<"companies">) => void;
  onRefresh: () => void;
}

export function CompanyList({ companies, onEdit, onAddAdmin, onRefresh }: CompanyListProps) {
  const [toggleConfirm, setToggleConfirm] = useState<{ open: boolean; company: Tables<"companies"> | null }>({
    open: false,
    company: null,
  });

  const handleToggleStatus = async () => {
    if (!toggleConfirm.company) return;

    try {
      const newStatus = !toggleConfirm.company.is_active;
      const { error } = await supabase
        .from("companies")
        .update({ is_active: newStatus })
        .eq("id", toggleConfirm.company.id);

      if (error) throw error;

      toast.success(
        newStatus
          ? "Empresa ativada com sucesso!"
          : "Empresa desativada com sucesso!"
      );
      onRefresh();
    } catch (error: any) {
      console.error("Error toggling company status:", error);
      toast.error(error.message || "Erro ao alterar status da empresa");
    } finally {
      setToggleConfirm({ open: false, company: null });
    }
  };

  if (companies.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{company.name}</p>
                    {company.trade_name && (
                      <p className="text-sm text-muted-foreground">
                        {company.trade_name}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.cnpj || "-"}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {company.email && <p>{company.email}</p>}
                    {company.phone && (
                      <p className="text-muted-foreground">{company.phone}</p>
                    )}
                    {!company.email && !company.phone && "-"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.city && company.state
                    ? `${company.city}/${company.state}`
                    : company.city || company.state || "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={company.is_active ? "default" : "secondary"}
                    className={
                      company.is_active
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {company.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(company)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAddAdmin(company)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setToggleConfirm({ open: true, company })}
                        className={company.is_active ? "text-amber-600" : "text-green-600"}
                      >
                        {company.is_active ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={toggleConfirm.open}
        onOpenChange={(open) =>
          setToggleConfirm({ open, company: open ? toggleConfirm.company : null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleConfirm.company?.is_active ? "Desativar" : "Ativar"} empresa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleConfirm.company?.is_active
                ? `A empresa "${toggleConfirm.company?.name}" será desativada e seus usuários não poderão acessar o sistema.`
                : `A empresa "${toggleConfirm.company?.name}" será reativada e seus usuários poderão acessar o sistema novamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={
                toggleConfirm.company?.is_active
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {toggleConfirm.company?.is_active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
