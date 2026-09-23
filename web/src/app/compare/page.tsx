import { redirect } from "next/navigation";

// Merged into /predict; kept so old links keep working.
export default function ComparePage() {
  redirect("/predict");
}
