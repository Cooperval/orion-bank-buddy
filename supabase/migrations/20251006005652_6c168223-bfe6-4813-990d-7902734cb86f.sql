-- Drop all existing policies that use user_has_demo_access()
DROP POLICY IF EXISTS "Users can manage banks of their companies" ON public.banks;
DROP POLICY IF EXISTS "Users can manage budget categories of their companies" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can manage CFOP classifications of their companies" ON public.cfop_classifications;
DROP POLICY IF EXISTS "Users can manage DRE configurations of their companies" ON public.dre_line_configurations;
DROP POLICY IF EXISTS "Users can manage employees of their companies" ON public.employees;
DROP POLICY IF EXISTS "Users can manage financial metrics of their companies" ON public.financial_metrics;
DROP POLICY IF EXISTS "Users can manage future entries of their companies" ON public.future_entries;
DROP POLICY IF EXISTS "Users can manage NFe documents of their companies" ON public.nfe_documents;
DROP POLICY IF EXISTS "Users can manage NFe duplicatas of their companies" ON public.nfe_duplicatas;
DROP POLICY IF EXISTS "Users can manage NFe emitters of their companies" ON public.nfe_emitters;
DROP POLICY IF EXISTS "Users can manage NFe items of their companies" ON public.nfe_items;
DROP POLICY IF EXISTS "Users can manage NFe recipients of their companies" ON public.nfe_recipients;
DROP POLICY IF EXISTS "Users can manage NFe taxes of their companies" ON public.nfe_taxes;
DROP POLICY IF EXISTS "Users can manage ofx uploads of their companies" ON public.ofx_uploads;
DROP POLICY IF EXISTS "Users can manage products of their companies" ON public.products;
DROP POLICY IF EXISTS "Users can manage transaction classifications of their companies" ON public.transaction_classifications;
DROP POLICY IF EXISTS "Users can manage transactions of their companies" ON public.transactions;

-- Banks policies
CREATE POLICY "Users can view banks of their companies"
ON public.banks FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert banks in their companies"
ON public.banks FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update banks of their companies"
ON public.banks FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete banks of their companies"
ON public.banks FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Budget categories policies
CREATE POLICY "Users can view budget categories of their companies"
ON public.budget_categories FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert budget categories in their companies"
ON public.budget_categories FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update budget categories of their companies"
ON public.budget_categories FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete budget categories of their companies"
ON public.budget_categories FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- CFOP classifications policies
CREATE POLICY "Users can view CFOP classifications of their companies"
ON public.cfop_classifications FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert CFOP classifications in their companies"
ON public.cfop_classifications FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update CFOP classifications of their companies"
ON public.cfop_classifications FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete CFOP classifications of their companies"
ON public.cfop_classifications FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- DRE line configurations policies
CREATE POLICY "Users can view DRE configurations of their companies"
ON public.dre_line_configurations FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert DRE configurations in their companies"
ON public.dre_line_configurations FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update DRE configurations of their companies"
ON public.dre_line_configurations FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete DRE configurations of their companies"
ON public.dre_line_configurations FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Employees policies
CREATE POLICY "Users can view employees of their companies"
ON public.employees FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert employees in their companies"
ON public.employees FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update employees of their companies"
ON public.employees FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete employees of their companies"
ON public.employees FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Financial metrics policies
CREATE POLICY "Users can view financial metrics of their companies"
ON public.financial_metrics FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert financial metrics in their companies"
ON public.financial_metrics FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update financial metrics of their companies"
ON public.financial_metrics FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete financial metrics of their companies"
ON public.financial_metrics FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Future entries policies
CREATE POLICY "Users can view future entries of their companies"
ON public.future_entries FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert future entries in their companies"
ON public.future_entries FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update future entries of their companies"
ON public.future_entries FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete future entries of their companies"
ON public.future_entries FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- NFe documents policies
CREATE POLICY "Users can view NFe documents of their companies"
ON public.nfe_documents FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert NFe documents in their companies"
ON public.nfe_documents FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update NFe documents of their companies"
ON public.nfe_documents FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete NFe documents of their companies"
ON public.nfe_documents FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- NFe duplicatas policies (access via nfe_documents)
CREATE POLICY "Users can view NFe duplicatas of their companies"
ON public.nfe_duplicatas FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_duplicatas.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can insert NFe duplicatas in their companies"
ON public.nfe_duplicatas FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_duplicatas.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can update NFe duplicatas of their companies"
ON public.nfe_duplicatas FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_duplicatas.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can delete NFe duplicatas of their companies"
ON public.nfe_duplicatas FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_duplicatas.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

-- NFe emitters policies (access via nfe_documents)
CREATE POLICY "Users can view NFe emitters of their companies"
ON public.nfe_emitters FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_emitters.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can insert NFe emitters in their companies"
ON public.nfe_emitters FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_emitters.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can update NFe emitters of their companies"
ON public.nfe_emitters FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_emitters.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can delete NFe emitters of their companies"
ON public.nfe_emitters FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_emitters.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

-- NFe items policies (access via nfe_documents)
CREATE POLICY "Users can view NFe items of their companies"
ON public.nfe_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_items.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can insert NFe items in their companies"
ON public.nfe_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_items.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can update NFe items of their companies"
ON public.nfe_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_items.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can delete NFe items of their companies"
ON public.nfe_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_items.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

-- NFe recipients policies (access via nfe_documents)
CREATE POLICY "Users can view NFe recipients of their companies"
ON public.nfe_recipients FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_recipients.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can insert NFe recipients in their companies"
ON public.nfe_recipients FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_recipients.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can update NFe recipients of their companies"
ON public.nfe_recipients FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_recipients.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can delete NFe recipients of their companies"
ON public.nfe_recipients FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.nfe_documents nd
  WHERE nd.id = nfe_recipients.nfe_document_id
    AND user_has_company_access_via_profile(nd.company_id)
));

-- NFe taxes policies (access via nfe_items -> nfe_documents)
CREATE POLICY "Users can view NFe taxes of their companies"
ON public.nfe_taxes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.nfe_items ni
  JOIN public.nfe_documents nd ON nd.id = ni.nfe_document_id
  WHERE ni.id = nfe_taxes.nfe_item_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can insert NFe taxes in their companies"
ON public.nfe_taxes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.nfe_items ni
  JOIN public.nfe_documents nd ON nd.id = ni.nfe_document_id
  WHERE ni.id = nfe_taxes.nfe_item_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can update NFe taxes of their companies"
ON public.nfe_taxes FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.nfe_items ni
  JOIN public.nfe_documents nd ON nd.id = ni.nfe_document_id
  WHERE ni.id = nfe_taxes.nfe_item_id
    AND user_has_company_access_via_profile(nd.company_id)
));

CREATE POLICY "Users can delete NFe taxes of their companies"
ON public.nfe_taxes FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.nfe_items ni
  JOIN public.nfe_documents nd ON nd.id = ni.nfe_document_id
  WHERE ni.id = nfe_taxes.nfe_item_id
    AND user_has_company_access_via_profile(nd.company_id)
));

-- OFX uploads policies
CREATE POLICY "Users can view ofx uploads of their companies"
ON public.ofx_uploads FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert ofx uploads in their companies"
ON public.ofx_uploads FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update ofx uploads of their companies"
ON public.ofx_uploads FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete ofx uploads of their companies"
ON public.ofx_uploads FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Products policies
CREATE POLICY "Users can view products of their companies"
ON public.products FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert products in their companies"
ON public.products FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update products of their companies"
ON public.products FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete products of their companies"
ON public.products FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Transaction classifications policies (access via transactions)
CREATE POLICY "Users can view transaction classifications of their companies"
ON public.transaction_classifications FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_classifications.transaction_id
    AND user_has_company_access_via_profile(t.company_id)
));

CREATE POLICY "Users can insert transaction classifications in their companies"
ON public.transaction_classifications FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_classifications.transaction_id
    AND user_has_company_access_via_profile(t.company_id)
));

CREATE POLICY "Users can update transaction classifications of their companies"
ON public.transaction_classifications FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_classifications.transaction_id
    AND user_has_company_access_via_profile(t.company_id)
));

CREATE POLICY "Users can delete transaction classifications of their companies"
ON public.transaction_classifications FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_classifications.transaction_id
    AND user_has_company_access_via_profile(t.company_id)
));

-- Transactions policies
CREATE POLICY "Users can view transactions of their companies"
ON public.transactions FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert transactions in their companies"
ON public.transactions FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update transactions of their companies"
ON public.transactions FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete transactions of their companies"
ON public.transactions FOR DELETE
USING (user_has_company_access_via_profile(company_id));