import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Receipts from "./pages/Receipts";
import Transactions from "./pages/Transactions";
import Imprests from "./pages/Imprests";
import Accounts from "./pages/Accounts";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Projects from "./pages/Projects";
import Contacts from "./pages/Contacts";
import Invoices from "./pages/Invoices";
import Wizard from "./pages/Wizard";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Budgets from "./pages/Budgets";
import Analytics from "./pages/Analytics";
import Audit from "./pages/Audit";
import Explorer from "./pages/Explorer";
import Packs from "./pages/Packs";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/imprests" element={<Imprests />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/wizard" element={<Wizard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/packs" element={<Packs />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/team" element={<Team />} />
      </Route>
    </Routes>
  );
}
