import { computeEngagedRange } from './engaged-indices';
import { areRangesEqual, EMPTY_RANGE, type IndexRange } from './index-range';
import {
  LinearLayoutManager,
  type ItemLayout,
  type ItemMeasurement,
} from './layout-manager';
import { RenderStack } from './render-stack';

const DEFAULT_ITEM_TYPE = 'default';

export interface RecyclerViewManagerProps<T> {
  data: ReadonlyArray<T>;
  getItemType?: (item: T, index: number) => string;
  drawDistance: number;
}

/**
 * FlashList: `RecyclerViewManager`. Methods: `updateViewportSize` is
 * `updateLayoutParams`, `applyMeasurements` is `modifyChildrenLayout`,
 * `getItemCount` is `getDataLength`, `recomputeEngagedRange` is
 * `recomputeEngagedIndices`, `syncRenderStack` is `updateRenderStack`.
 *
 * All list state outside React.
 *
 * Event handlers and effects call the `update*` methods, which recompute the
 * engaged range and re-sync the render stack when needed. Each returns `true`
 * when the list must re-render. Render itself only reads the results.
 */
export class RecyclerViewManager<T> {
  private layoutManager = new LinearLayoutManager();
  private renderStack = new RenderStack();
  private props: RecyclerViewManagerProps<T>;
  private scrollOffset = 0;
  private viewportSize = 0;
  private engagedRange = EMPTY_RANGE;

  constructor(props: RecyclerViewManagerProps<T>) {
    this.props = props;
  }

  updateProps(props: RecyclerViewManagerProps<T>) {
    this.props = props;
  }

  /**
   * Resizes the layouts to the new data and re-syncs the render stack, even
   * if the engaged range stays the same, so keys of deleted items are freed.
   */
  processDataUpdate() {
    this.layoutManager.setItemCount(this.props.data.length);
    this.engagedRange = this.computeEngagedRange();
    this.syncRenderStack();
  }

  updateScrollOffset(scrollOffset: number): boolean {
    this.scrollOffset = scrollOffset;
    return this.recomputeEngagedRange();
  }

  updateViewportSize(viewportSize: number): boolean {
    this.viewportSize = viewportSize;
    return this.recomputeEngagedRange();
  }

  /** Returns `true` if any item moved, since cells must then be repositioned. */
  applyMeasurements(measurements: ReadonlyArray<ItemMeasurement>): boolean {
    const hasLayoutChanged = this.layoutManager.applyMeasurements(measurements);
    const hasRangeChanged = this.recomputeEngagedRange();
    return hasLayoutChanged || hasRangeChanged;
  }

  getRenderStack() {
    return this.renderStack.getEntries();
  }

  getItemCount(): number {
    return this.layoutManager.getItemCount();
  }

  getLayout(index: number): ItemLayout {
    return this.layoutManager.getLayout(index);
  }

  getContentSize(): number {
    return this.layoutManager.getContentSize();
  }

  /** Re-syncs the render stack only if a different set of items is engaged. */
  private recomputeEngagedRange(): boolean {
    const engagedRange = this.computeEngagedRange();
    if (areRangesEqual(engagedRange, this.engagedRange)) {
      return false;
    }
    this.engagedRange = engagedRange;
    this.syncRenderStack();
    return true;
  }

  private computeEngagedRange(): IndexRange {
    return computeEngagedRange({
      layoutManager: this.layoutManager,
      scrollOffset: this.scrollOffset,
      viewportSize: this.viewportSize,
      drawDistance: this.props.drawDistance,
    });
  }

  private syncRenderStack() {
    const { data, getItemType } = this.props;
    this.renderStack.sync(this.engagedRange, data.length, (index) =>
      getItemType ? getItemType(data[index] as T, index) : DEFAULT_ITEM_TYPE
    );
  }
}
