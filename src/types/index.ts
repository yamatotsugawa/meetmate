export type Person = {
  id?: string;
  ownerId: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  contactMethod?: "LINE" | "Messenger" | "Mail" | "Phone" | "Other";
  facebookUrl?: string;
  relation?: "Business" | "Friend" | "Fan" | "Customer" | "Other";
  businessDesc?: string;
  memo?: string;
  introWanted?: string; // 相手が欲しい紹介
  createdAt: number;
  updatedAt: number;
};

export type Meeting = {
  id?: string;
  ownerId: string;
  personId?: string; // 紐づける相手（任意）
  metAt: number;     // いつ（epoch ms）
  mode: "Real" | "Online";
  place?: string;    // リアルの場合
  note?: string;
  createdAt: number;
  updatedAt: number;
};
