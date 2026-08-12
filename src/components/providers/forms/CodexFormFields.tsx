import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  GripVertical,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import EndpointSpeedTest from "./EndpointSpeedTest";
import { ApiKeySection, EndpointField, ModelDropdown } from "./shared";
import { XaiOAuthSection } from "./XaiOAuthSection";
import {
  fetchModelsForConfig,
  fetchXaiOauthModels,
  showFetchModelsError,
  type FetchedModel,
} from "@/lib/api/model-fetch";
import { CustomUserAgentField } from "./CustomUserAgentField";
import { LocalProxyRequestOverridesField } from "./LocalProxyRequestOverridesField";
import { cn } from "@/lib/utils";
import { formatCodexModelDisplayName } from "@/utils/codexModelDisplay";
import { findUnavailableConfiguredModelIds } from "@/utils/codexModelAvailability";
import {
  CODEX_CONTEXT_WINDOW_PRESETS,
  getCodexContextWindowOrDefault,
  inferCodexContextWindow,
} from "@/utils/codexContextWindow";
import type {
  ClaudeApiKeyField,
  CodexApiFormat,
  CodexCatalogModel,
  CodexChatReasoning,
  PromptCacheRoutingMode,
  ProviderCategory,
} from "@/types";
import type { AppId } from "@/lib/api";

interface EndpointCandidate {
  url: string;
}

interface CodexFormFieldsProps {
  appId?: AppId;
  providerId?: string;
  providerName?: string;
  // xAI OAuth 托管预设（Grok 订阅）：隐藏 API Key / 端点输入，挂账号选择区块
  isXaiOauthPreset?: boolean;
  isXaiOauthAuthenticated?: boolean;
  selectedXaiAccountId?: string | null;
  onXaiAccountSelect?: (accountId: string | null) => void;
  // API Key
  codexApiKey: string;
  onApiKeyChange: (key: string) => void;
  category?: ProviderCategory;
  shouldShowApiKeyLink: boolean;
  websiteUrl: string;
  isPartner?: boolean;
  partnerPromotionKey?: string;

  // Base URL
  shouldShowSpeedTest: boolean;
  codexBaseUrl: string;
  onBaseUrlChange: (url: string) => void;
  isFullUrl: boolean;
  onFullUrlChange: (value: boolean) => void;
  isEndpointModalOpen: boolean;
  onEndpointModalToggle: (open: boolean) => void;
  onCustomEndpointsChange?: (endpoints: string[]) => void;
  autoSelect: boolean;
  onAutoSelectChange: (checked: boolean) => void;

  // Grok Build keeps an explicit default model; Codex derives it from catalog order.
  codexModel?: string;
  onModelChange?: (model: string) => void;

  // API Format
  // Note: wire_api is always "responses" for Codex; apiFormat controls proxy-layer conversion
  apiFormat: CodexApiFormat;
  onApiFormatChange: (format: CodexApiFormat) => void;
  // Auth field for the Anthropic Messages upstream (only used when apiFormat === "anthropic")
  anthropicAuthField: ClaudeApiKeyField;
  onAnthropicAuthFieldChange: (value: ClaudeApiKeyField) => void;
  // Anthropic path: whether to emulate the Claude Code client
  impersonateClaudeCode: boolean;
  onImpersonateClaudeCodeChange: (value: boolean) => void;
  // Anthropic path: output ceiling override (empty string = use default). Digits only.
  maxOutputTokens: string;
  onMaxOutputTokensChange: (value: string) => void;
  codexChatReasoning?: CodexChatReasoning;
  onCodexChatReasoningChange?: (value: CodexChatReasoning) => void;
  promptCacheRouting: PromptCacheRoutingMode;
  onPromptCacheRoutingChange: (value: PromptCacheRoutingMode) => void;

  // Model Catalog
  catalogModels?: CodexCatalogModel[];
  onCatalogModelsChange?: (models: CodexCatalogModel[]) => void;

  // Speed Test Endpoints
  speedTestEndpoints: EndpointCandidate[];

  // Local proxy User-Agent override
  customUserAgent: string;
  onCustomUserAgentChange: (value: string) => void;
  localProxyHeadersOverride: string;
  onLocalProxyHeadersOverrideChange: (value: string) => void;
  localProxyBodyOverride: string;
  onLocalProxyBodyOverrideChange: (value: string) => void;
}

type CodexCatalogRow = CodexCatalogModel & { rowId: string };

function createCatalogRow(
  seed?: Partial<CodexCatalogModel>,
  providerName = "",
): CodexCatalogRow {
  const contextWindow = getCodexContextWindowOrDefault(
    seed?.contextWindow,
    seed?.model ?? "",
    providerName,
  );

  return {
    rowId: crypto.randomUUID(),
    model: seed?.model ?? "",
    displayName: seed?.displayName ?? "",
    contextWindow: contextWindow ?? "",
    ...(seed?.enabled === false ? { enabled: false } : {}),
    ...(typeof seed?.menuOrder === "number"
      ? { menuOrder: seed.menuOrder }
      : {}),
    // Carry native-profile overrides verbatim (not user-editable in the row UI,
    // but must survive load->save so the official catalog fidelity is kept).
    ...(seed?.supportsParallelToolCalls !== undefined
      ? { supportsParallelToolCalls: seed.supportsParallelToolCalls }
      : {}),
    ...(seed?.inputModalities ? { inputModalities: seed.inputModalities } : {}),
    ...(seed?.baseInstructions
      ? { baseInstructions: seed.baseInstructions }
      : {}),
  };
}

// Compares rows (with rowId) to incoming models (without) by data fields only,
// so both sync effects can use the same equality definition. Hidden native-profile
// fields are included so switching between providers with identical visible fields
// but different base_instructions / tools / modalities still rebuilds the rows.
function catalogRowsMatchModels(
  rows: CodexCatalogModel[],
  models: CodexCatalogModel[],
): boolean {
  if (rows.length !== models.length) return false;
  return rows.every((row, i) => {
    const incoming = models[i];
    return (
      row.model === (incoming.model ?? "") &&
      (row.displayName ?? "") === (incoming.displayName ?? "") &&
      String(row.contextWindow ?? "") ===
        String(incoming.contextWindow ?? "") &&
      (row.enabled !== false) === (incoming.enabled !== false) &&
      (row.menuOrder ?? null) === (incoming.menuOrder ?? null) &&
      (row.supportsParallelToolCalls ?? null) ===
        (incoming.supportsParallelToolCalls ?? null) &&
      (row.baseInstructions ?? "") === (incoming.baseInstructions ?? "") &&
      JSON.stringify(row.inputModalities ?? []) ===
        JSON.stringify(incoming.inputModalities ?? [])
    );
  });
}

interface SortableCatalogModelRowProps {
  row: CodexCatalogRow;
  index: number;
  expanded: boolean;
  fetchedModels: FetchedModel[];
  onExpandedChange: () => void;
  onRemove: () => void;
  onUpdate: (index: number, patch: Partial<CodexCatalogModel>) => void;
}

function SortableCatalogModelRow({
  row,
  index,
  expanded,
  fetchedModels,
  onExpandedChange,
  onRemove,
  onUpdate,
}: SortableCatalogModelRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.rowId });
  const displayName =
    row.displayName?.trim() ||
    formatCodexModelDisplayName(row.model) ||
    t("codexConfig.unnamedModel", { defaultValue: "New model" });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "border-b border-border-default bg-background last:border-b-0",
        isDragging && "relative z-10 opacity-90 shadow-md",
      )}
    >
      <div className="flex min-h-11 items-center gap-2 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
          title={t("codexConfig.dragModel", {
            defaultValue: "Drag to reorder",
          })}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Checkbox
          checked={row.enabled !== false}
          onCheckedChange={(checked) =>
            onUpdate(index, { enabled: checked === true })
          }
          aria-label={t("codexConfig.disableModel", {
            defaultValue: "Show in Codex menu",
          })}
        />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onExpandedChange}
        >
          <span className="block truncate text-sm font-medium">
            {displayName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.model ||
              t("codexConfig.modelIdRequired", {
                defaultValue: "Enter a model ID",
              })}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            value={row.contextWindow ?? ""}
            onChange={(event) =>
              onUpdate(index, {
                contextWindow: event.target.value.replace(/[^\d]/g, ""),
              })
            }
            placeholder={t("codexConfig.catalogColumnContext", {
              defaultValue: "Context window",
            })}
            aria-label={t("codexConfig.catalogColumnContext", {
              defaultValue: "Context window",
            })}
            className="h-8 w-24 shrink-0 sm:w-28"
          />
          <div className="flex items-center gap-0.5">
            {CODEX_CONTEXT_WINDOW_PRESETS.map((preset) => {
              const isActive = String(row.contextWindow ?? "") === preset.value;
              return (
                <Button
                  key={preset.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 min-w-9 rounded-md px-1 text-[10px] tabular-nums",
                    isActive &&
                      "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                  onClick={() =>
                    onUpdate(index, { contextWindow: preset.value })
                  }
                  title={t("codexConfig.setContextWindow", {
                    value: preset.label,
                    defaultValue: `Set context window to ${preset.label}`,
                  })}
                  aria-label={t("codexConfig.setContextWindow", {
                    value: preset.label,
                    defaultValue: `Set context window to ${preset.label}`,
                  })}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={onExpandedChange}
          title={t("codexConfig.modelDetails", {
            defaultValue: "Model details",
          })}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title={t("codexConfig.deleteModel", {
            defaultValue: "Delete model",
          })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="grid gap-3 border-t border-border-default bg-muted/20 px-3 py-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <FormLabel className="text-xs">
              {t("codexConfig.catalogColumnDisplay", {
                defaultValue: "Menu display name",
              })}
            </FormLabel>
            <Input
              value={row.displayName ?? ""}
              onChange={(event) =>
                onUpdate(index, { displayName: event.target.value })
              }
              placeholder={formatCodexModelDisplayName(row.model)}
            />
          </div>
          <div className="space-y-1.5">
            <FormLabel className="text-xs">
              {t("codexConfig.catalogColumnModel", {
                defaultValue: "Actual request model",
              })}
            </FormLabel>
            <div className="flex gap-1">
              <Input
                value={row.model}
                onChange={(event) =>
                  onUpdate(index, { model: event.target.value })
                }
                placeholder={t("codexConfig.catalogModelPlaceholder", {
                  defaultValue: "e.g. deepseek-v4-flash",
                })}
                className="flex-1"
              />
              {fetchedModels.length > 0 && (
                <ModelDropdown
                  models={fetchedModels}
                  onSelect={(id) =>
                    onUpdate(index, {
                      model: id,
                      displayName: row.displayName?.trim()
                        ? row.displayName
                        : formatCodexModelDisplayName(id),
                    })
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CodexFormFields({
  appId = "codex",
  providerId,
  providerName = "",
  isXaiOauthPreset,
  isXaiOauthAuthenticated,
  selectedXaiAccountId,
  onXaiAccountSelect,
  codexApiKey,
  onApiKeyChange,
  category,
  shouldShowApiKeyLink,
  websiteUrl,
  isPartner,
  partnerPromotionKey,
  shouldShowSpeedTest,
  codexBaseUrl,
  onBaseUrlChange,
  isFullUrl,
  onFullUrlChange,
  isEndpointModalOpen,
  onEndpointModalToggle,
  onCustomEndpointsChange,
  autoSelect,
  onAutoSelectChange,
  codexModel = "",
  onModelChange,
  apiFormat,
  onApiFormatChange,
  anthropicAuthField,
  onAnthropicAuthFieldChange,
  impersonateClaudeCode,
  onImpersonateClaudeCodeChange,
  maxOutputTokens,
  onMaxOutputTokensChange,
  codexChatReasoning = {},
  onCodexChatReasoningChange,
  promptCacheRouting,
  onPromptCacheRoutingChange,
  catalogModels = [],
  onCatalogModelsChange,
  speedTestEndpoints,
  customUserAgent,
  onCustomUserAgentChange,
  localProxyHeadersOverride,
  onLocalProxyHeadersOverrideChange,
  localProxyBodyOverride,
  onLocalProxyBodyOverrideChange,
}: CodexFormFieldsProps) {
  const { t } = useTranslation();

  const [fetchedModels, setFetchedModels] = useState<FetchedModel[]>([]);
  const [latestFetchedModelIds, setLatestFetchedModelIds] = useState<
    string[] | null
  >(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  // 拉取请求序号：请求身份（Base URL / 完整地址开关 / API Key / 自定义 UA）
  // 一变即自增，清空旧列表并作废在途响应——/models 结果可能按 Key 的模型
  // 授权返回，换号后残留旧列表会误导选择
  const fetchModelsSeqRef = useRef(0);

  useEffect(() => {
    fetchModelsSeqRef.current += 1;
    setFetchedModels((prev) => (prev.length === 0 ? prev : []));
    setLatestFetchedModelIds(null);
  }, [
    codexBaseUrl,
    isFullUrl,
    codexApiKey,
    customUserAgent,
    isXaiOauthPreset,
    isXaiOauthAuthenticated,
    selectedXaiAccountId,
  ]);
  // 思考能力随 Chat 格式显示（仅 Chat Completions 转换路径用得上）；Codex 模型常驻
  //（填了才生成 catalog）。两者都已与「路由接管」概念解耦。
  const isChatFormat = apiFormat === "openai_chat";
  const isAnthropicFormat = apiFormat === "anthropic";
  const canEditCatalog = Boolean(onCatalogModelsChange);
  const canEditReasoning = Boolean(onCodexChatReasoningChange);
  const supportsThinking =
    codexChatReasoning.supportsThinking === true ||
    codexChatReasoning.supportsEffort === true;
  const supportsEffort = codexChatReasoning.supportsEffort === true;

  // 高级区在有任何可见配置时自动展开（仅折叠→展开，不会自动折叠）。
  const hasRequestOverrides = Boolean(
    localProxyHeadersOverride.trim() || localProxyBodyOverride.trim(),
  );
  const hasAnyAdvancedValue =
    !!customUserAgent ||
    hasRequestOverrides ||
    apiFormat === "openai_responses" ||
    isAnthropicFormat ||
    supportsThinking ||
    supportsEffort ||
    promptCacheRouting !== "auto" ||
    !!maxOutputTokens;
  const [advancedExpanded, setAdvancedExpanded] = useState(
    isXaiOauthPreset ? false : hasAnyAdvancedValue,
  );

  // 预设/编辑加载填充高级值后自动展开（仅从折叠→展开，不会自动折叠）；
  // xAI OAuth 托管预设的高级值都是预设自带的，无需展示，保持折叠
  useEffect(() => {
    if (isXaiOauthPreset) {
      return;
    }
    if (hasAnyAdvancedValue) {
      setAdvancedExpanded(true);
    }
  }, [hasAnyAdvancedValue, isXaiOauthPreset]);

  const [catalogRows, setCatalogRows] = useState<CodexCatalogRow[]>(() =>
    catalogModels.map((m) => createCatalogRow(m, providerName)),
  );
  const [expandedCatalogRows, setExpandedCatalogRows] = useState<Set<string>>(
    new Set(),
  );
  const [modelSearch, setModelSearch] = useState("");
  const catalogSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // 记录上次发送给父组件的数据，避免重复触发
  const lastSentModelsRef = useRef<CodexCatalogModel[]>(catalogModels);

  // 父 → 子：仅当 prop 数据真的变化（预设切换 / 编辑加载）时才重建 rowId；
  // 同 shape 时保留现有 rowId，避免编辑过程中焦点丢失。
  useEffect(() => {
    setCatalogRows((current) => {
      if (catalogRowsMatchModels(current, catalogModels)) return current;
      return catalogModels.map((m) => createCatalogRow(m, providerName));
    });
    // 同步更新 ref，避免父组件传入新数据时子→父 effect 误判为本地修改
    lastSentModelsRef.current = catalogModels;
  }, [catalogModels, providerName]);

  // 子 → 父：rowId 是视图层概念，不应进入持久化数据；剥离后再回传。
  // 注意：依赖数组不包含 catalogModels，避免父→子更新触发子→父回调形成循环。
  useEffect(() => {
    if (!onCatalogModelsChange) return;
    const next: CodexCatalogModel[] = catalogRows.map(
      ({ rowId: _rowId, ...rest }) => rest,
    );
    // 只有当数据真的变化时才通知父组件
    if (catalogRowsMatchModels(catalogRows, lastSentModelsRef.current)) return;
    lastSentModelsRef.current = next;
    onCatalogModelsChange(next);
  }, [catalogRows, onCatalogModelsChange]);

  const handleReasoningThinkingChange = useCallback(
    (checked: boolean) => {
      if (!onCodexChatReasoningChange) return;
      onCodexChatReasoningChange({
        ...codexChatReasoning,
        supportsThinking: checked,
        supportsEffort: checked ? codexChatReasoning.supportsEffort : false,
      });
    },
    [codexChatReasoning, onCodexChatReasoningChange],
  );

  const handleReasoningEffortChange = useCallback(
    (checked: boolean) => {
      if (!onCodexChatReasoningChange) return;
      onCodexChatReasoningChange({
        ...codexChatReasoning,
        supportsThinking: checked ? true : codexChatReasoning.supportsThinking,
        supportsEffort: checked,
        effortParam: checked
          ? (codexChatReasoning.effortParam ?? "reasoning_effort")
          : "none",
      });
    },
    [codexChatReasoning, onCodexChatReasoningChange],
  );

  const unavailableConfiguredModelIds = useMemo(
    () =>
      latestFetchedModelIds === null
        ? []
        : findUnavailableConfiguredModelIds(
            catalogRows,
            latestFetchedModelIds.map((id) => ({ id })),
          ),
    [catalogRows, latestFetchedModelIds],
  );

  const handleFetchedModels = useCallback(
    (models: FetchedModel[]) => {
      setFetchedModels(models);
      setLatestFetchedModelIds(models.map((model) => model.id));

      const unavailableModelIds = findUnavailableConfiguredModelIds(
        catalogRows,
        models,
      );
      if (models.length === 0) {
        toast.info(t("providerForm.fetchModelsEmpty"));
      } else {
        toast.success(
          t("providerForm.fetchModelsSuccess", { count: models.length }),
        );
      }
      if (unavailableModelIds.length > 0) {
        toast.warning(
          t("codexConfig.fetchedModelsMissingTitle", {
            count: unavailableModelIds.length,
            defaultValue: "{{count}} 个已添加模型不在本次获取的模型列表中",
          }),
          {
            description: t("codexConfig.fetchedModelsMissingDescription", {
              models: unavailableModelIds.join(", "),
              defaultValue:
                "缺失: {{models}}。已保留当前配置，不会自动停用或删除。",
            }),
            duration: 8000,
            closeButton: true,
          },
        );
      }
    },
    [catalogRows, t],
  );

  const handleFetchModels = useCallback(() => {
    // xAI OAuth 托管预设：不走 base_url + key 的 /models 探测，
    // 直接用托管账号 token 拉取（与 Claude 表单同一后端命令）
    if (isXaiOauthPreset) {
      if (!isXaiOauthAuthenticated) {
        toast.error(
          t("xaiOauth.loginRequired", {
            defaultValue: "请先登录 xAI 账号",
          }),
        );
        return;
      }
      const seq = ++fetchModelsSeqRef.current;
      setIsFetchingModels(true);
      fetchXaiOauthModels(selectedXaiAccountId ?? null)
        .then((models) => {
          if (seq !== fetchModelsSeqRef.current) return;
          handleFetchedModels(models);
        })
        .catch((err) => {
          if (seq !== fetchModelsSeqRef.current) return;
          console.warn("[XaiOAuth] Failed to fetch models:", err);
          showFetchModelsError(err, t);
        })
        .finally(() => setIsFetchingModels(false));
      return;
    }

    if (!codexBaseUrl || !codexApiKey) {
      showFetchModelsError(null, t, {
        hasApiKey: !!codexApiKey,
        hasBaseUrl: !!codexBaseUrl,
      });
      return;
    }
    const seq = ++fetchModelsSeqRef.current;
    setIsFetchingModels(true);
    fetchModelsForConfig(
      codexBaseUrl,
      codexApiKey,
      isFullUrl,
      undefined,
      customUserAgent,
    )
      .then((models) => {
        if (seq !== fetchModelsSeqRef.current) return;
        handleFetchedModels(models);
      })
      .catch((err) => {
        if (seq !== fetchModelsSeqRef.current) return;
        console.warn("[ModelFetch] Failed:", err);
        showFetchModelsError(err, t);
      })
      .finally(() => setIsFetchingModels(false));
  }, [
    codexBaseUrl,
    codexApiKey,
    isFullUrl,
    customUserAgent,
    isXaiOauthPreset,
    isXaiOauthAuthenticated,
    selectedXaiAccountId,
    handleFetchedModels,
    t,
  ]);

  const handleAddCatalogRow = useCallback(() => {
    if (!onCatalogModelsChange) return;
    const next = createCatalogRow(undefined, providerName);
    setCatalogRows((current) => [next, ...current]);
    setExpandedCatalogRows((current) => new Set(current).add(next.rowId));
  }, [onCatalogModelsChange, providerName]);

  const handleUpdateCatalogRow = useCallback(
    (index: number, patch: Partial<CodexCatalogModel>) => {
      setCatalogRows((current) =>
        current.map((row, i) => {
          if (i !== index) return row;
          const next = { ...row, ...patch };
          if ("model" in patch && !String(row.contextWindow ?? "").trim()) {
            const inferred = inferCodexContextWindow(
              String(patch.model ?? row.model),
              providerName,
            );
            if (inferred) next.contextWindow = inferred;
          }
          return next;
        }),
      );
    },
    [providerName],
  );

  const handleRemoveCatalogRow = useCallback((rowId: string) => {
    setCatalogRows((current) => current.filter((row) => row.rowId !== rowId));
    setExpandedCatalogRows((current) => {
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
  }, []);

  const handleToggleFetchedModel = useCallback(
    (modelId: string, checked: boolean) => {
      if (!onCatalogModelsChange) return;
      if (!checked) {
        setCatalogRows((current) =>
          current.filter((row) => row.model.trim() !== modelId),
        );
        return;
      }
      setCatalogRows((current) => {
        if (current.some((row) => row.model.trim() === modelId)) return current;
        return [
          createCatalogRow(
            {
              model: modelId,
              displayName: formatCodexModelDisplayName(modelId),
            },
            providerName,
          ),
          ...current,
        ];
      });
    },
    [onCatalogModelsChange, providerName],
  );

  const handleCatalogDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCatalogRows((current) => {
      const oldIndex = current.findIndex((row) => row.rowId === active.id);
      const newIndex = current.findIndex((row) => row.rowId === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  }, []);

  const selectedModelIds = useMemo(
    () =>
      new Set(
        catalogRows.map((row) => row.model.trim()).filter((id) => id.length),
      ),
    [catalogRows],
  );
  const availableModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    const seen = new Set<string>();
    return fetchedModels.filter((model) => {
      if (seen.has(model.id) || selectedModelIds.has(model.id)) return false;
      seen.add(model.id);
      if (!query) return true;
      return (
        model.id.toLowerCase().includes(query) ||
        formatCodexModelDisplayName(model.id).toLowerCase().includes(query)
      );
    });
  }, [fetchedModels, modelSearch, selectedModelIds]);

  const defaultModelSuggestions = useMemo<FetchedModel[]>(() => {
    const seen = new Set<string>();
    const suggestions: FetchedModel[] = [];
    for (const row of catalogRows) {
      const id = row.model.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      suggestions.push({
        id,
        ownedBy: t("codexConfig.modelMappingTitle", {
          defaultValue: "Codex models",
        }),
      });
    }
    for (const model of fetchedModels) {
      if (seen.has(model.id)) continue;
      seen.add(model.id);
      suggestions.push(model);
    }
    return suggestions;
  }, [catalogRows, fetchedModels, t]);

  const trimmedDefaultModel = codexModel.trim();
  const isDefaultModelOutsideCatalog =
    !!trimmedDefaultModel &&
    !catalogRows.some(
      (row) =>
        row.enabled !== false && row.model.trim() === trimmedDefaultModel,
    );

  const handleAddDefaultModelToCatalog = useCallback(() => {
    if (!onCatalogModelsChange || !trimmedDefaultModel) return;
    setCatalogRows((current) => [
      createCatalogRow(
        {
          model: trimmedDefaultModel,
          displayName: formatCodexModelDisplayName(trimmedDefaultModel),
        },
        providerName,
      ),
      ...current,
    ]);
  }, [onCatalogModelsChange, providerName, trimmedDefaultModel]);

  return (
    <>
      {/* xAI OAuth 认证（Grok 订阅托管账号） */}
      {isXaiOauthPreset && (
        <XaiOAuthSection
          selectedAccountId={selectedXaiAccountId}
          onAccountSelect={onXaiAccountSelect}
        />
      )}

      {!isXaiOauthPreset && (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <ApiKeySection
            id="codexApiKey"
            label="API Key"
            value={codexApiKey}
            onChange={onApiKeyChange}
            category={category}
            shouldShowLink={shouldShowApiKeyLink}
            websiteUrl={websiteUrl}
            isPartner={isPartner}
            partnerPromotionKey={partnerPromotionKey}
            placeholder={{
              official: t("providerForm.codexOfficialNoApiKey", {
                defaultValue: "官方供应商无需 API Key",
              }),
              thirdParty: t("providerForm.codexApiKeyAutoFill", {
                defaultValue: "输入 API Key，将自动填充到配置",
              }),
            }}
          />
          {shouldShowSpeedTest && (
            <EndpointField
              id="codexBaseUrl"
              label={t("codexConfig.apiUrlLabel")}
              value={codexBaseUrl}
              onChange={onBaseUrlChange}
              placeholder={t("providerForm.codexApiEndpointPlaceholder")}
              showFullUrlToggle
              isFullUrl={isFullUrl}
              onFullUrlChange={onFullUrlChange}
              onManageClick={() => onEndpointModalToggle(true)}
            />
          )}
        </div>
      )}

      {appId !== "codex" && category !== "official" && onModelChange && (
        <div className="space-y-1.5">
          <FormLabel htmlFor="codexDefaultModel">
            {t("codexConfig.defaultModelLabel", { defaultValue: "默认模型" })}
          </FormLabel>
          <div className="flex gap-1">
            <Input
              id="codexDefaultModel"
              value={codexModel}
              onChange={(event) => onModelChange(event.target.value)}
              placeholder={t("codexConfig.defaultModelPlaceholder", {
                defaultValue: "例如: gpt-5.6",
              })}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleFetchModels}
              disabled={isFetchingModels}
              className="shrink-0"
              title={t("providerForm.fetchModels")}
            >
              {isFetchingModels ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            {defaultModelSuggestions.length > 0 && (
              <ModelDropdown
                models={defaultModelSuggestions}
                onSelect={(id) => onModelChange(id)}
              />
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("codexConfig.defaultModelHint", {
              defaultValue:
                "Codex 启动时默认使用的模型。留空时使用菜单顺序中的第一个模型。",
            })}
          </p>
          {isDefaultModelOutsideCatalog && (
            <p className="flex flex-wrap items-center gap-x-2 text-xs leading-relaxed text-muted-foreground">
              {t("codexConfig.defaultModelNotInCatalog", {
                defaultValue: "该模型尚未加入 Codex 模型菜单。",
              })}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={handleAddDefaultModelToCatalog}
              >
                {t("codexConfig.addToModelMapping", {
                  defaultValue: "加入 Codex 模型",
                })}
              </Button>
            </p>
          )}
        </div>
      )}

      {category !== "official" && canEditCatalog && (
        <section className="space-y-3 border-y border-border-default py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <FormLabel>
                {t("codexConfig.modelMappingTitle", {
                  defaultValue: "Codex models",
                })}
              </FormLabel>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("codexConfig.modelMappingHint", {
                  defaultValue:
                    "Select models for the Codex model menu. Drag selected models to change their order.",
                })}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                disabled={isFetchingModels}
                className="h-8 gap-1.5"
              >
                {isFetchingModels ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {t("providerForm.fetchModels")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCatalogRow}
                className="h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("codexConfig.addCatalogModel", {
                  defaultValue: "Add manually",
                })}
              </Button>
            </div>
          </div>

          {unavailableConfiguredModelIds.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">
                  {t("codexConfig.fetchedModelsMissingTitle", {
                    count: unavailableConfiguredModelIds.length,
                    defaultValue:
                      "{{count}} 个已添加模型不在本次获取的模型列表中",
                  })}
                </p>
                <p className="mt-0.5 break-words text-amber-800/90 dark:text-amber-100/85">
                  {t("codexConfig.fetchedModelsMissingDescription", {
                    models: unavailableConfiguredModelIds.join(", "),
                    defaultValue:
                      "缺失: {{models}}。已保留当前配置，不会自动停用或删除。",
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-foreground">
                {t("codexConfig.enabledModels", {
                  defaultValue: "Menu order",
                })}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {t("codexConfig.selectedModelCount", {
                  count: catalogRows.filter((row) => row.enabled !== false)
                    .length,
                  defaultValue: "{{count}} selected",
                })}
              </span>
            </div>
            {catalogRows.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-border-default">
                <DndContext
                  sensors={catalogSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCatalogDragEnd}
                >
                  <SortableContext
                    items={catalogRows.map((row) => row.rowId)}
                    strategy={verticalListSortingStrategy}
                  >
                    {catalogRows.map((row, index) => (
                      <SortableCatalogModelRow
                        key={row.rowId}
                        row={row}
                        index={index}
                        expanded={expandedCatalogRows.has(row.rowId)}
                        fetchedModels={fetchedModels}
                        onExpandedChange={() =>
                          setExpandedCatalogRows((current) => {
                            const next = new Set(current);
                            if (next.has(row.rowId)) next.delete(row.rowId);
                            else next.add(row.rowId);
                            return next;
                          })
                        }
                        onRemove={() => handleRemoveCatalogRow(row.rowId)}
                        onUpdate={handleUpdateCatalogRow}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            ) : (
              <div className="border-y border-dashed border-border-default py-4 text-center text-xs text-muted-foreground">
                {t("codexConfig.noModelsSelected", {
                  defaultValue: "No models selected",
                })}
              </div>
            )}
          </div>

          {fetchedModels.length > 0 && (
            <div className="space-y-2 border-t border-border-default pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-foreground">
                  {t("codexConfig.availableModels", {
                    defaultValue: "Available models",
                  })}
                </span>
                <div className="relative w-full max-w-64">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={modelSearch}
                    onChange={(event) => setModelSearch(event.target.value)}
                    placeholder={t("codexConfig.searchModels", {
                      defaultValue: "Search models",
                    })}
                    className="h-8 pl-8"
                  />
                </div>
              </div>
              {availableModels.length > 0 ? (
                <ScrollArea className="h-52">
                  <div className="grid gap-2 pr-3 md:grid-cols-3">
                    {availableModels.map((model) => (
                      <label
                        key={model.id}
                        className="flex min-h-14 cursor-pointer items-center gap-2 rounded-md border border-border-default px-3 py-2 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={false}
                          aria-label={t("codexConfig.enableModel", {
                            model: model.id,
                            defaultValue: "Add {{model}} to Codex menu",
                          })}
                          onCheckedChange={(checked) =>
                            handleToggleFetchedModel(model.id, checked === true)
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {formatCodexModelDisplayName(model.id)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {model.id}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  {t("codexConfig.noAvailableModels", {
                    defaultValue: "All matching models are already selected",
                  })}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 高级选项 —— 上游格式/思考能力/自定义 UA；预设供应商通常无需展开 */}
      {category !== "official" && (
        <Collapsible
          open={advancedExpanded}
          onOpenChange={setAdvancedExpanded}
          className="rounded-lg border border-border-default p-4"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant={null}
              size="sm"
              className="h-8 w-full justify-start gap-1.5 px-0 text-sm font-medium text-foreground hover:opacity-70"
            >
              {advancedExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {t("providerForm.advancedOptionsToggle", {
                defaultValue: "高级选项",
              })}
            </Button>
          </CollapsibleTrigger>
          {!advancedExpanded && (
            <p className="mt-1 ml-1 text-xs text-muted-foreground">
              {t("codexConfig.advancedSectionHint", {
                defaultValue:
                  "包含上游格式、思考能力与自定义 User-Agent。使用 Chat Completions 协议的供应商需开启路由接管才能使用。",
              })}
            </p>
          )}
          <CollapsibleContent className="space-y-3 pt-3">
            {/* 上游格式 —— Chat 需开启路由接管（走代理转换），Responses 原生直连。
                沿用 shouldShowSpeedTest 门控，cloud_provider 保持不可切换；
                xAI OAuth 托管预设格式钉死 Responses，不可切换。 */}
            {shouldShowSpeedTest && !isXaiOauthPreset && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <FormLabel htmlFor="codex-upstream-format">
                    {t("codexConfig.upstreamFormatLabel", {
                      defaultValue: "上游格式",
                    })}
                  </FormLabel>
                  <Select
                    value={apiFormat}
                    onValueChange={(value) =>
                      onApiFormatChange(value as CodexApiFormat)
                    }
                  >
                    <SelectTrigger
                      id="codex-upstream-format"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai_chat">
                        {t("codexConfig.upstreamFormatChat", {
                          defaultValue: "Chat Completions（需开启路由）",
                        })}
                      </SelectItem>
                      <SelectItem value="openai_responses">
                        {t("codexConfig.upstreamFormatResponses", {
                          defaultValue: "Responses（原生）",
                        })}
                      </SelectItem>
                      <SelectItem value="anthropic">
                        {t("codexConfig.upstreamFormatAnthropic", {
                          defaultValue: "Anthropic Messages（需开启路由）",
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("codexConfig.upstreamFormatHint", {
                      defaultValue:
                        "供应商原生是 Responses API 就选 Responses（直连，不转换格式）；使用 Chat Completions 协议就选 Chat；供应商只提供原生 Anthropic Messages 协议就选 Anthropic Messages。Chat 与 Anthropic Messages 均需开启路由接管才能转换为 Responses。",
                    })}
                  </p>
                </div>

                {isAnthropicFormat && (
                  <div className="space-y-1.5">
                    <FormLabel htmlFor="codex-anthropic-auth-field">
                      {t("codexConfig.anthropicAuthFieldLabel", {
                        defaultValue: "认证字段",
                      })}
                    </FormLabel>
                    <Select
                      value={anthropicAuthField}
                      onValueChange={(value) =>
                        onAnthropicAuthFieldChange(value as ClaudeApiKeyField)
                      }
                    >
                      <SelectTrigger
                        id="codex-anthropic-auth-field"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANTHROPIC_AUTH_TOKEN">
                          {t("codexConfig.anthropicAuthFieldAuthToken", {
                            defaultValue:
                              "ANTHROPIC_AUTH_TOKEN（Authorization）",
                          })}
                        </SelectItem>
                        <SelectItem value="ANTHROPIC_API_KEY">
                          {t("codexConfig.anthropicAuthFieldApiKey", {
                            defaultValue: "ANTHROPIC_API_KEY（x-api-key）",
                          })}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("codexConfig.anthropicAuthFieldHint", {
                        defaultValue:
                          "选择网关接收 API Key 的请求头：ANTHROPIC_AUTH_TOKEN 发送 Authorization: Bearer；ANTHROPIC_API_KEY 发送 x-api-key。两者只发其一。",
                      })}
                    </p>
                  </div>
                )}

                {isAnthropicFormat && (
                  <div className="flex items-center justify-between gap-4 border-t border-border-default pt-3">
                    <div className="space-y-1">
                      <FormLabel>
                        {t("codexConfig.impersonateClaudeCodeLabel", {
                          defaultValue: "模拟 Claude Code 客户端",
                        })}
                      </FormLabel>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("codexConfig.impersonateClaudeCodeHint", {
                          defaultValue:
                            "网关或其上游限制只能通过 Claude Code 使用时开启：伪装 User-Agent、anthropic-beta、x-app 请求头，并在系统提示首行注入 Claude Code 身份。",
                        })}
                      </p>
                    </div>
                    <Switch
                      checked={impersonateClaudeCode}
                      onCheckedChange={onImpersonateClaudeCodeChange}
                      aria-label={t("codexConfig.impersonateClaudeCodeLabel", {
                        defaultValue: "模拟 Claude Code 客户端",
                      })}
                    />
                  </div>
                )}

                {isAnthropicFormat && (
                  <div className="space-y-1.5 border-t border-border-default pt-3">
                    <FormLabel htmlFor="codex-anthropic-max-output-tokens">
                      {t("codexConfig.maxOutputTokensLabel", {
                        defaultValue: "最大输出 tokens",
                      })}
                    </FormLabel>
                    <Input
                      id="codex-anthropic-max-output-tokens"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={maxOutputTokens}
                      onChange={(event) =>
                        onMaxOutputTokensChange(
                          event.target.value.replace(/[^\d]/g, ""),
                        )
                      }
                      placeholder={t("codexConfig.maxOutputTokensPlaceholder", {
                        defaultValue: "留空则使用默认 8192",
                      })}
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("codexConfig.maxOutputTokensHint", {
                        defaultValue:
                          "Codex 不会把 model_max_output_tokens 写进请求体，默认上限 8192 容易在长回答或深度思考时被截断（stop_reason=max_tokens）。此处设置会作为 Anthropic 的 max_tokens 覆盖请求值。请勿超过该模型/网关的真实输出上限，否则可能 400。留空使用默认 8192。",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isChatFormat && canEditReasoning && (
              <div
                className={cn(
                  "space-y-3",
                  shouldShowSpeedTest && "border-t border-border-default pt-3",
                )}
              >
                <div className="space-y-2">
                  <FormLabel>
                    {t("codexConfig.promptCacheRoutingLabel", {
                      defaultValue: "提示词缓存路由",
                    })}
                  </FormLabel>
                  <Select
                    value={promptCacheRouting}
                    onValueChange={(value) =>
                      onPromptCacheRoutingChange(
                        value as PromptCacheRoutingMode,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        {t("codexConfig.promptCacheRoutingAuto", {
                          defaultValue: "自动（推荐）",
                        })}
                      </SelectItem>
                      <SelectItem value="enabled">
                        {t("codexConfig.promptCacheRoutingEnabled", {
                          defaultValue: "开启",
                        })}
                      </SelectItem>
                      <SelectItem value="disabled">
                        {t("codexConfig.promptCacheRoutingDisabled", {
                          defaultValue: "关闭",
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("codexConfig.promptCacheRoutingHint", {
                      defaultValue:
                        "自动模式仅对已确认兼容的上游发送 prompt_cache_key；开启可用于其他兼容网关，关闭可避免严格网关因未知字段返回 400。只使用客户端提供的稳定会话 ID。",
                    })}
                  </p>
                </div>

                <div className="space-y-1">
                  <FormLabel>
                    {t("codexConfig.reasoningGroupTitle", {
                      defaultValue: "思考能力",
                    })}
                  </FormLabel>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("codexConfig.reasoningSectionHint", {
                      defaultValue:
                        "预设供应商已自动配置；自定义供应商会按名称/地址自动推断。仅当自动识别不准时才需手动覆盖。",
                    })}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <FormLabel>
                      {t("codexConfig.reasoningModeToggle", {
                        defaultValue: "支持思考模式",
                      })}
                    </FormLabel>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("codexConfig.reasoningModeHint", {
                        defaultValue:
                          "上游 Chat Completions 接口支持开启或关闭 thinking 时启用。Kimi、GLM、Qwen 等通常属于这一类。",
                      })}
                    </p>
                  </div>
                  <Switch
                    checked={supportsThinking}
                    onCheckedChange={handleReasoningThinkingChange}
                    aria-label={t("codexConfig.reasoningModeToggle", {
                      defaultValue: "支持思考模式",
                    })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-border-default pt-3">
                  <div className="space-y-1">
                    <FormLabel>
                      {t("codexConfig.reasoningEffortToggle", {
                        defaultValue: "支持思考等级",
                      })}
                    </FormLabel>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("codexConfig.reasoningEffortHint", {
                        defaultValue:
                          "上游支持 low/high/max 等思考深度控制时启用。启用后会自动启用思考模式，并把 Codex 的 reasoning.effort 转成上游 Chat 参数。",
                      })}
                    </p>
                  </div>
                  <Switch
                    checked={supportsEffort}
                    onCheckedChange={handleReasoningEffortChange}
                    aria-label={t("codexConfig.reasoningEffortToggle", {
                      defaultValue: "支持思考等级",
                    })}
                  />
                </div>
              </div>
            )}

            <div
              className={cn(
                "space-y-3",
                (shouldShowSpeedTest || (isChatFormat && canEditReasoning)) &&
                  "border-t border-border-default pt-3",
              )}
            >
              <CustomUserAgentField
                id="codex-custom-user-agent"
                value={customUserAgent}
                onChange={onCustomUserAgentChange}
              />
              <div className="border-t border-border-default pt-3">
                <LocalProxyRequestOverridesField
                  headersJson={localProxyHeadersOverride}
                  bodyJson={localProxyBodyOverride}
                  onHeadersJsonChange={onLocalProxyHeadersOverrideChange}
                  onBodyJsonChange={onLocalProxyBodyOverrideChange}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 端点测速弹窗 - Codex */}
      {shouldShowSpeedTest && isEndpointModalOpen && (
        <EndpointSpeedTest
          appId={appId}
          providerId={providerId}
          value={codexBaseUrl}
          onChange={onBaseUrlChange}
          initialEndpoints={speedTestEndpoints}
          visible={isEndpointModalOpen}
          onClose={() => onEndpointModalToggle(false)}
          autoSelect={autoSelect}
          onAutoSelectChange={onAutoSelectChange}
          onCustomEndpointsChange={onCustomEndpointsChange}
        />
      )}
    </>
  );
}
