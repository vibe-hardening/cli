import type { Metadata } from 'next';
import { Landing } from '../_components/Landing';
import { strings } from '../_lib/strings';

export const metadata: Metadata = {
  title: strings.zh.title,
  alternates: {
    languages: {
      en: '/',
      'zh-Hant': '/zh',
    },
  },
};

export default function Page() {
  return <Landing locale="zh" />;
}
