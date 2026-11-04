# 实验参数读取与显示

`Subplots → Annotations → Experimental conditions` 默认隐藏。样品、微波、调制、采集四组各占一行；仅显示勾选且有值的字段。文件值自动填写，可手动覆盖或恢复；显示设置不改写原始元数据。

## 文件映射

CIQTEK `.epr` 已检查 EPR-ProCt 5.6.0 的真实 1D Field Sweep 与 2D Field-Power Sweep 文件。下表列出数值字段的格式单位。带显式单位的值优先采用声明单位。

| 图内名称 | CIQTEK `setting` 字段及单位 | Bruker BES3T `.DSC` 字段及单位 | 默认显示单位 |
| --- | --- | --- | --- |
| mwFreq | `frequency`，GHz；优先使用逐轨迹 `freq` | `MWFQ`，Hz；设备层 `FrequencyMon` 带单位 | GHz |
| P | `lineEdit_MB_Power`，mW | `MWPW`，W；设备层 `Power` 带单位 | mW |
| Atten. | `lineEdit_MB_Attenuation`，dB | `PowerAtten` 带单位 | dB |
| Mod. amp. | `lineEdit_SC_ModulAmp`，G | `B0MA`，T；设备层 `ModAmp` 带单位 | mT |
| Mod. freq. | `comboBox_SC_ModulFreq`，kHz | `B0MF`，Hz；设备层 `ModFreq` 带单位 | kHz |
| Time constant | `lineEdit_SC_TimeConstant`，ms | `RCTC`，s；设备层 `TimeConst` 带单位 | ms |
| Convert time | `lineEdit_SC_ConvertTime`，ms | `SPTP`，s；设备层 `ConvTime` 带单位 | ms |
| Sweep time | 显式 `sweepTime` / `scanTime` 及单位；缺失保留空值 | 设备层 `SweepTime` 带单位 | s |
| No. of sweeps | 当前实验 `lineEdit_<实验类型>_NoOfSweeps` | `AVGS`；缺失时读取 `NbScansAcc` | 无 |

扫描次数不取轨迹数量、`complete_experiment_num` 或计划扫描次数 `NbScansToDo`。时间常数、Convert time 与 Sweep time 独立；不使用文件创建/保存时刻差代替扫描时间，也不自动将点数乘以 Convert time 标为文件扫描时间。内部字段 `pointTime` 为旧项目兼容保留，界面与图中均显示 Convert time。

样品名称、编号、简短说明读取明确的 `sampleName`、`sampleId` / `sampleNumber`、`sampleDescription`；支持 `.epr` 根对象或 `setting`。BES3T 的 `SAMP` 对应样品名称、`CMNT` 对应说明。字段为空时可手动补充，不使用文件名、实验名或 `TITL` 代替样品。多曲线不同值显示范围或并列文本，部分缺失标记 incomplete。

采集频率标为 `mwFreq`，磁场对齐参考频率另标为 `refFreq`。功率/衰减、调制幅度扫描显示实际坐标范围；衰减转功率须有用户设置的 P₀，图中注明校准值。未校准的衰减扫描不显示一个固定功率。

## 实现与检查

`src/data/acquisition-metadata.js` 负责厂商字段与格式单位；`experimental-conditions.js` 负责统一换算、范围和分组。旧项目已保留的 `setting` / DSC 元数据可直接使用新映射，无须重导入。缺失或未知字段不猜测单位。参数框随项目/配置保存；原有文件格式维持 11/10。

合成测试保留已核对的字段结构与单位，不发布用户实验谱线、样品名称或文件内容。单元检查覆盖 CIQTEK 实际结构导入、BES3T SI 单位、设备层扫描时间、SPL 优先级、扫描次数与样品来源。浏览器回归通过 Open Data 导入合成 `.epr`、`.DSC + .DTA`，检查自动值、四组行序、显示名称、手动恢复、保存重载与 PNG/SVG/PDF。

字段核对来源：

- [EasySpin 的 BES3T 示例](https://github.com/StollLab/EasySpin/blob/main/tests/eprfiles/E580_Xepr26b6_cwX_WillMyers.DSC) 同时列有 SPL 数值和带单位的设备层参数。
- [EasySpin BES3T 读取器](https://github.com/StollLab/EasySpin/blob/main/easyspin/private/eprload_BrukerBES3T.m) 明确说明 MWPW 为 W、SPTP 为 s、AVGS 为平均次数。
- [OpenReadout 作者的 BES3T 格式说明](https://openreadout.github.io/openreadout/formats/bruker-epr.html) 列出 MWFQ、B0MA、B0MF、RCTC 等标准字段的 SI 单位。
- [Green Chemistry 论文补充材料](https://www.rsc.org/suppdata/d5/gc/d5gc00426h/d5gc00426h1.pdf) 给出 CIQTEK 连续波实验的 G、kHz、ms 与 mW 参数名称和单位；具体 JSON 字段另用本地真实文件核对。
