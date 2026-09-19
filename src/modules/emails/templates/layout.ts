import { createElement as h } from 'react';
import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';
export function emailLayout(title: string, body: string) {
  return h(
    Html,
    { lang: 'en' },
    h(Head),
    h(
      Body,
      { style: { fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f8fa' } },
      h(
        Container,
        { style: { padding: '32px', backgroundColor: '#ffffff' } },
        h(Heading, null, title),
        h(Text, { style: { whiteSpace: 'pre-wrap', lineHeight: '1.6' } }, body),
        h(Hr),
        h(Text, null, 'MediMatrix • Patient appointments'),
      ),
    ),
  );
}
