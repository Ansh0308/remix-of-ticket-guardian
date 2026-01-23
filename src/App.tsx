import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import EventDetail from "./pages/EventDetail";
import AutoBookSetup from "./pages/AutoBookSetup";
import MyBookings from "./pages/MyBookings";
import Resale from "./pages/Resale";
import SellTicket from "./pages/SellTicket";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import RealtimeAutoBookProvider from "./context/RealtimeAutoBookContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RealtimeAutoBookProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/home" element={<Home />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/autobook/:eventId" element={<AutoBookSetup />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/resale" element={<Resale />} />
              <Route path="/sell" element={<SellTicket />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RealtimeAutoBookProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
