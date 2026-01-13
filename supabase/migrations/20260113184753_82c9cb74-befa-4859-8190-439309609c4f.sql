
-- Create enum types
CREATE TYPE public.event_status AS ENUM ('coming_soon', 'live');
CREATE TYPE public.seat_type AS ENUM ('general', 'premium', 'vip');
CREATE TYPE public.autobook_status AS ENUM ('active', 'success', 'failed');
CREATE TYPE public.resale_status AS ENUM ('available', 'sold');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  city TEXT NOT NULL,
  venue TEXT NOT NULL,
  ticket_release_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status event_status NOT NULL DEFAULT 'coming_soon',
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  high_demand BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auto_books table
CREATE TABLE public.auto_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 4),
  seat_type seat_type NOT NULL DEFAULT 'general',
  max_budget DECIMAL(10,2) NOT NULL,
  status autobook_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Create resale_tickets table
CREATE TABLE public.resale_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status resale_status NOT NULL DEFAULT 'available',
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resale_tickets ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Events policies (public read, admin write)
CREATE POLICY "Anyone can view events" ON public.events
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert events" ON public.events
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events" ON public.events
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events" ON public.events
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Auto-books policies
CREATE POLICY "Users can view own auto-books" ON public.auto_books
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own auto-books" ON public.auto_books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own auto-books" ON public.auto_books
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own auto-books" ON public.auto_books
  FOR DELETE USING (auth.uid() = user_id);

-- Resale tickets policies
CREATE POLICY "Anyone can view available resale tickets" ON public.resale_tickets
  FOR SELECT USING (true);

CREATE POLICY "Users can create own resale listings" ON public.resale_tickets
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own resale listings" ON public.resale_tickets
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own resale listings" ON public.resale_tickets
  FOR DELETE USING (auth.uid() = seller_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auto_books_updated_at
  BEFORE UPDATE ON public.auto_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resale_tickets_updated_at
  BEFORE UPDATE ON public.resale_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update event status based on ticket release time
CREATE OR REPLACE FUNCTION public.update_event_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_release_time <= now() AND NEW.status = 'coming_soon' THEN
    NEW.status = 'live';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_event_status_on_update
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_event_status();

-- Insert sample events data
INSERT INTO public.events (name, category, description, date, city, venue, ticket_release_time, status, price, high_demand) VALUES
('IPL 2025 Final', 'Cricket', 'The ultimate showdown of IPL 2025. Watch the top two teams battle it out for the championship trophy.', '2025-05-25 19:30:00+05:30', 'Mumbai', 'Wankhede Stadium', '2025-02-01 10:00:00+05:30', 'coming_soon', 2500, true),
('Coldplay: Music of the Spheres', 'Concert', 'Experience Coldplay live in India! A spectacular show featuring their greatest hits and stunning visuals.', '2025-03-15 20:00:00+05:30', 'Mumbai', 'DY Patil Stadium', '2025-01-20 12:00:00+05:30', 'coming_soon', 4500, true),
('Zakir Khan Live', 'Comedy', 'India''s favorite comedian brings his hilarious new show. Get ready for an evening of non-stop laughter.', '2025-02-28 19:00:00+05:30', 'Delhi', 'Siri Fort Auditorium', '2025-01-25 10:00:00+05:30', 'coming_soon', 1200, false),
('Sunburn Festival 2025', 'Festival', 'Asia''s biggest electronic dance music festival returns with an incredible lineup of international DJs.', '2025-12-28 16:00:00+05:30', 'Goa', 'Vagator Beach', '2025-10-01 10:00:00+05:30', 'coming_soon', 3500, true),
('India vs Australia T20', 'Cricket', 'Witness the intense rivalry between India and Australia in this T20 international match.', '2025-01-20 19:00:00+05:30', 'Bangalore', 'M. Chinnaswamy Stadium', '2025-01-10 10:00:00+05:30', 'live', 1800, true),
('Arijit Singh Live', 'Concert', 'The voice of Bollywood performs his greatest hits live. An unforgettable musical evening awaits.', '2025-04-10 19:30:00+05:30', 'Hyderabad', 'GMC Balayogi Stadium', '2025-02-15 10:00:00+05:30', 'coming_soon', 3000, true),
('Comic Con India 2025', 'Festival', 'The ultimate pop culture extravaganza featuring comics, gaming, cosplay, and celebrity appearances.', '2025-02-14 10:00:00+05:30', 'Delhi', 'NSIC Exhibition Ground', '2025-01-05 10:00:00+05:30', 'live', 800, false),
('Vir Das: Mind Fool Tour', 'Comedy', 'Vir Das returns with his brand new international tour, bringing his sharp wit and global perspective.', '2025-03-22 20:00:00+05:30', 'Mumbai', 'NCPA', '2025-02-01 10:00:00+05:30', 'coming_soon', 1500, false);
