import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Download, Loader2 } from "lucide-react";
import type { FetchedModel } from "@/lib/api/model-fetch";
import { ModelOptionsList } from "./ModelDropdown";

interface ModelInputWithFetchProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fetchedModels: FetchedModel[];
  isLoading: boolean;
  /** 传入时显示获取按钮；不传时只在有数据后显示下拉 */
  onFetch?: () => void;
}

export function ModelInputWithFetch({
  id,
  value,
  onChange,
  placeholder,
  fetchedModels,
  isLoading,
  onFetch,
}: ModelInputWithFetchProps) {
  const { t } = useTranslation();

  // 已获取模型: 输入框下方直接展示可选模型,不再要求再次点击下拉按钮。
  if (fetchedModels.length > 0) {
    return (
      <div>
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <ModelOptionsList models={fetchedModels} onSelect={onChange} />
      </div>
    );
  }

  // 加载中: Input + Spinner
  if (isLoading) {
    return (
      <div className="flex gap-1">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1"
        />
        <Button variant="outline" size="icon" className="shrink-0" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      </div>
    );
  }

  // 有 onFetch: Input + 获取按钮
  if (onFetch) {
    return (
      <div className="flex gap-1">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          type="button"
          onClick={onFetch}
          title={t("providerForm.fetchModels")}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // 无 onFetch: 纯 Input
  return (
    <Input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
}
