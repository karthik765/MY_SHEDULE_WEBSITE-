import Link from "next/link";
import PageHeader from "@/components/studio/PageHeader";
import Icon from "@/components/studio/Icon";

export default function NotFound() {
  return <div className="not-found-studio"><p className="not-found-number" aria-hidden="true">404</p><PageHeader eyebrow="A SMALL DETOUR" title="A little off the beaten path." description="This page is not here. Your plans and progress are right where you left them." /><Link href="/" className="primary-action">Back to your day<Icon name="arrow" size={16} /></Link></div>;
}
