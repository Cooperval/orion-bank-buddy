-- Enable realtime for transactions table
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.transactions;

-- Enable realtime for transaction_classifications table  
ALTER TABLE public.transaction_classifications REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.transaction_classifications;

-- Enable realtime for ofx_uploads table
ALTER TABLE public.ofx_uploads REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.ofx_uploads;