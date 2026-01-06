import { createFileRoute } from '@tanstack/react-router'
import MDXContent from '../../docs/advanced/architecture.mdx'
import { DocWrapper, mdxComponents } from '@/components/docs/doc-page'

export const Route = createFileRoute('/docs/advanced/architecture')({
  component: () => (
    <DocWrapper currentPath="/docs/advanced/architecture">
      <MDXContent components={mdxComponents} />
    </DocWrapper>
  ),
})
