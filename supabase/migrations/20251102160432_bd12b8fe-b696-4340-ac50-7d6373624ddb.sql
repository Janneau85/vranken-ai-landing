-- Shopping List Tables
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  notes TEXT,
  is_checked BOOLEAN DEFAULT false,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE shopping_recurring_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  frequency_days INTEGER DEFAULT 7,
  last_added TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recipes Tables
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  servings INTEGER DEFAULT 4,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  instructions TEXT,
  image_url TEXT,
  category TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  notes TEXT
);

CREATE TABLE meal_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  custom_meal_name TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_meal_plan_date ON meal_plan(meal_date);

-- Todos Tables
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  recurrence_days INTEGER[],
  next_recurrence_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE todo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  estimated_minutes INTEGER,
  default_assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_assigned_to ON todos(assigned_to);
CREATE INDEX idx_todos_due_date ON todos(due_date);

-- Triggers
CREATE TRIGGER update_shopping_list_items_updated_at
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plan_updated_at
  BEFORE UPDATE ON meal_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies - Shopping List
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_recurring_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shopping list"
  ON shopping_list_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage recurring items"
  ON shopping_recurring_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies - Recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can view all ingredients"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage ingredients of own recipes"
  ON recipe_ingredients FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.created_by = auth.uid()
  ));

CREATE POLICY "Authenticated users can manage meal plan"
  ON meal_plan FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies - Todos
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage todos"
  ON todos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage todo templates"
  ON todo_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list_items;
ALTER PUBLICATION supabase_realtime ADD TABLE meal_plan;
ALTER PUBLICATION supabase_realtime ADD TABLE todos;