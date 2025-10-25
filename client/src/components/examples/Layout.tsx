import { Layout } from "../Layout";

export default function LayoutExample() {
  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Example Content</h2>
        <p className="text-muted-foreground">
          This is an example of the layout with some content inside.
        </p>
      </div>
    </Layout>
  );
}
