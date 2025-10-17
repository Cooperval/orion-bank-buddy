-- Enable admin users to insert new companies
CREATE POLICY "Admins can insert companies" ON public.companies
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Enable admin users to delete companies (only if no members exist)
CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);