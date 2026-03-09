import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PiggyBank, Search, Loader2 } from "lucide-react";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

interface SavingsProduct {
  id: string;
  name: string;
  interest_rate: number;
  minimum_balance: number;
  is_active: boolean;
}

export default function SavingsManager() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [products, setProducts] = useState<SavingsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [goalsRes, productsRes] = await Promise.all([
      supabase.from("savings_goals").select("*, profiles(full_name, email)").order("created_at", { ascending: false }),
      supabase.from("savings_products").select("*").order("name"),
    ]);

    if (goalsRes.data) setGoals(goalsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    setLoading(false);
  };

  const toggleProduct = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("savings_products")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update product");
    } else {
      toast.success("Product updated");
      loadData();
    }
  };

  const filteredGoals = goals.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Savings Management
        </CardTitle>
        <CardDescription>
          Manage savings goals and products. Total Saved: ${totalSaved.toLocaleString()} / ${totalTarget.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="goals">
          <TabsList>
            <TabsTrigger value="goals">Savings Goals</TabsTrigger>
            <TabsTrigger value="products">Savings Products</TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by goal name or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Goal Name</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGoals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <div>
                        <p>{goal.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{goal.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{goal.name}</TableCell>
                    <TableCell>
                      ${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}
                      <div className="w-24 bg-secondary rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(100, (goal.current_amount / goal.target_amount) * 100)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={goal.status === "completed" ? "default" : "secondary"}>
                        {goal.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Interest Rate</TableHead>
                  <TableHead>Minimum Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.interest_rate}%</TableCell>
                    <TableCell>${product.minimum_balance.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleProduct(product.id, product.is_active)}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
