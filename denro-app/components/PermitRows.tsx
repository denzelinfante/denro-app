import React from "react";
import { View, Text, Switch, TextInput } from "react-native";
import { Input } from "./FormParts";

/* ---------- LGU Permit Row ---------- */
type LGUPermitRowProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  num: string;
  onChangeNum: (s: string) => void;
  di: string;
  onChangeDi: (s: string) => void;
  ed: string;
  onChangeEd: (s: string) => void;
};

export const LGUPermitRow: React.FC<LGUPermitRowProps> = ({
  label,
  checked,
  onToggle,
  num,
  onChangeNum,
  di,
  onChangeDi,
  ed,
  onChangeEd,
}) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Switch value={checked} onValueChange={onToggle} />
      <Text style={{ marginLeft: 8, fontWeight: "600" }}>{label}</Text>
    </View>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12 }}>Permit #</Text>
        <Input value={num} onChangeText={onChangeNum} keyboardType="number-pad" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12 }}>Date issued (YYYY-MM-DD)</Text>
        <Input value={di} onChangeText={onChangeDi} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12 }}>Expiration date (YYYY-MM-DD)</Text>
        <Input value={ed} onChangeText={onChangeEd} />
      </View>
    </View>
  </View>
);

/* ---------- DENR/EMB Permit Row ---------- */
type DENRPermitRowProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  noLabel: string;
  num: string;
  onChangeNum: (s: string) => void;
  di: string;
  onChangeDi: (s: string) => void;
};

export const DENRPermitRow: React.FC<DENRPermitRowProps> = ({
  label,
  checked,
  onToggle,
  noLabel,
  num,
  onChangeNum,
  di,
  onChangeDi,
}) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Switch value={checked} onValueChange={onToggle} />
      <Text style={{ marginLeft: 8, fontWeight: "600" }}>{label}</Text>
    </View>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12 }}>{noLabel}</Text>
        <Input value={num} onChangeText={onChangeNum} keyboardType="number-pad" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12 }}>Date issued (YYYY-MM-DD)</Text>
        <Input value={di} onChangeText={onChangeDi} />
      </View>
    </View>
  </View>
);
