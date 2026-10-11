export type TransactionType = 'credit' | 'payment';
export type TransactionStatus = 'approved' | 'review' | 'declined';

export type Account = {
  id: number;
  name: string;
  country: string;
  balanceCents: number;
  createdAt: string;
};

export type Transaction = {
  id: number;
  accountId: number;
  type: TransactionType;
  amountCents: number;
  merchant: string | null;
  category: string | null;
  country: string | null;
  status: TransactionStatus;
  riskScore: number | null;
  fraudReasons: string[];
  reviewedBy: 'rules' | 'llm' | null;
  createdAt: string;
};
