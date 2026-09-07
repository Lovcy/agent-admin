import { mount, flushPromises } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import { describe, expect, it } from 'vitest';
import ProjectTable from './ProjectTable.vue';

describe('project presentation', () => {
  it('renders translated statuses and an explicit empty state', async () => {
    const wrapper = mount(ProjectTable, {
      props: {
        loading: false,
        rows: [
          { id: 'P1', name: '项目一', owner: 'Lin', status: 'paused', updatedAt: '2026-09-06' },
        ],
      },
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('项目一');
    expect(wrapper.text()).toContain('已暂停');
    await wrapper.setProps({ rows: [] });
    await flushPromises();
    expect(wrapper.text()).toContain('没有符合条件的项目');
    wrapper.unmount();
  });
});
