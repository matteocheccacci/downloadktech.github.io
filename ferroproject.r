library(readxl) library(ggplot2) library(dplyr) library(car) library(lmtest) library(nortest) library(ggpubr)

Caricare il dataset

data <- read_excel("Neuralgia_2.xlsx")

Esplorare i dati

str(data) summary(data)

Convertire variabili categoriche in fattori

categorical_vars <- c("Pain", "Sex", "Treatment") data[categorical_vars] <- lapply(data[categorical_vars], as.factor)

Visualizzazione dei dati

Istogramma della variabile SBP

ggplot(data, aes(x = SBP)) + geom_histogram(binwidth = 5, fill = "blue", alpha = 0.5) + labs(title = "Distribuzione della SBP", x = "SBP", y = "Frequenza")

Boxplot della SBP per Pain

ggplot(data, aes(x = Pain, y = SBP, fill = Pain)) + geom_boxplot() + labs(title = "Distribuzione della SBP per Pain", x = "Pain", y = "SBP")

Scatter plot di SBP vs Age

ggplot(data, aes(x = Age, y = SBP)) + geom_point() + geom_smooth(method = "lm", col = "red") + labs(title = "Relazione tra SBP e Age", x = "Età", y = "SBP")

Statistiche descrittive

data %>% group_by(Pain) %>% summarise( mean_SBP = mean(SBP, na.rm = TRUE), median_SBP = median(SBP, na.rm = TRUE), sd_SBP = sd(SBP, na.rm = TRUE), IQR_SBP = IQR(SBP, na.rm = TRUE) )

Test d'ipotesi

shapiro.test(data$SBP)  # Test di normalità bartlett.test(SBP ~ Pain, data = data)  # Test di omogeneità delle varianze

if (shapiro.test(data$SBP)$p.value > 0.05 & bartlett.test(SBP ~ Pain, data = data)$p.value > 0.05) { test_result <- aov(SBP ~ Pain, data = data) summary(test_result)  # ANOVA se i presupposti sono soddisfatti } else { test_result <- kruskal.test(SBP ~ Pain, data = data) print(test_result)  # Test di Kruskal-Wallis se i presupposti non sono soddisfatti }

Modello di regressione

model <- lm(SBP ~ Pain + Age + Sex, data = data) summary(model)

Diagnosi del modello

par(mfrow = c(2,2)) plot(model)

