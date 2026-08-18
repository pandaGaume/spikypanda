import { getEditorSchema, SPIKE_SYNAPSE_TYPE_ID, SpikeSynapse } from "spikypanda-core";
import type { Connection } from "../../dev/nodeeditor/src/connection";
import { PropertyEditor } from "../../dev/nodeeditor/src/components/property-editor";
import { UIItemBase } from "../../dev/nodeeditor/src/inspectable";
import type { NodeUI } from "../../dev/nodeeditor/src/node-ui";

interface CapturedTarget {
    kind: "node" | "connection";
    label: string;
    typeId?: string;
    data: object | null;
    node?: NodeUI;
}

interface PropertyEditorHarness {
    _currentTarget: CapturedTarget | null;
    _mountEditorForTarget: jest.Mock<boolean, [CapturedTarget]>;
}

function createEditorHarness(): { editor: PropertyEditor; state: PropertyEditorHarness } {
    const editor = Object.create(PropertyEditor.prototype) as PropertyEditor;
    const state = editor as unknown as PropertyEditorHarness;
    state._currentTarget = null;
    state._mountEditorForTarget = jest.fn<boolean, [CapturedTarget]>((_target) => true);
    return { editor, state };
}

describe("PropertyEditor connection selection", () => {
    test("exposes the concrete synapse model and its editable schema", () => {
        const synapse = new SpikeSynapse();
        const connection = {
            typeId: SPIKE_SYNAPSE_TYPE_ID,
            item: new UIItemBase(synapse),
        } as Connection;
        const { editor, state } = createEditorHarness();

        editor.setConnection(connection);

        expect(state._mountEditorForTarget).toHaveBeenCalledTimes(1);
        const target = state._mountEditorForTarget.mock.calls[0][0];
        expect(target).toMatchObject({
            kind: "connection",
            label: "SpikeSynapse",
            typeId: SPIKE_SYNAPSE_TYPE_ID,
            data: synapse,
        });
        const fields = getEditorSchema(target.data!).fields.map((field) => field.propertyName);
        expect(fields).toEqual(expect.arrayContaining(["weight", "delay", "plasticity"]));

        (target.data as SpikeSynapse).weight = -0.25;
        expect(synapse.weight).toBe(-0.25);
    });

    test("preserves the existing node selection entry point", () => {
        const model = new SpikeSynapse();
        const node = {
            id: "node_1",
            label: "Existing node",
            typeId: "Test:node",
            item: new UIItemBase(model),
        } as NodeUI;
        const { editor, state } = createEditorHarness();

        editor.setSelection([node]);

        expect(state._mountEditorForTarget).toHaveBeenCalledTimes(1);
        expect(state._mountEditorForTarget.mock.calls[0][0]).toMatchObject({
            kind: "node",
            label: "Existing node",
            typeId: "Test:node",
            data: model,
            node,
        });
    });
});
