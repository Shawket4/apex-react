import { Navigate, useParams } from 'react-router-dom';

/** An old invoice edit link opens the invoice it pointed at, read-only. */
export function RedirectToInvoice() {
  const { id } = useParams();
  return <Navigate to={`/service-invoices/${id ?? ''}`} replace />;
}
