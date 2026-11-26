-- E1-06: force catalog creation through the guarded atomic RPC.
-- Existing UI uses create_evalia_model; colors of an existing model have no direct edit workflow.
revoke insert on public.models from authenticated;
revoke insert(name,size_label,image_path,price_dozen_bs,is_active) on public.models from authenticated;
revoke insert,delete on public.model_colors from authenticated;
revoke insert(model_id,color_id) on public.model_colors from authenticated;
